/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * useScheduleGenerator.ts
 *
 * Hook to handle create SSE stream for generate/regenerate functions.
 */

import React, { useState } from "react";
import { toaster } from "@/components/ui/toaster.tsx";
import {parseDate} from "@/utils/timeUtils.ts";
import {
  type ScheduleResponse,
  type ScheduleDraft,
  type DraftSummary,
  type Assignment,
  type ScheduleRequest,
  generateScheduleStream,
  generateRegenStream,
  getScheduleDraftSchedule,
  updateDraft, type GenerationProgress, type StreamError, type ShiftTemplateRead
} from "../scheduleApi.ts";
import type {PositionWithRequirementsRead} from "@/features/position/positionApi.ts";
import { useScheduleGenerationContext } from "./useScheduleGenerationContext.ts";


export interface GenerateConfig {
  startDate: string;
  endDate: string;
  positionIds: number[];
  selectIgnorePending: boolean;
  minDaysOff: number;
  maxDaysOff: number;
  maxSteps: number;
  templates: ShiftTemplateRead[];
}

export const useScheduleGenerator = (
  setDraftSummaries: React.Dispatch<React.SetStateAction<DraftSummary[]>>,
  setCalendarViewDate: React.Dispatch<React.SetStateAction<Date>>,
  setStartDate: React.Dispatch<React.SetStateAction<string>>,
  setEndDate: React.Dispatch<React.SetStateAction<string>>
) => {
  const {
    isGenerating,
    setIsGenerating,
    genProgress,
    setGenProgress,
    setGenStep,
    setGenTotal,
    setGenScore,
    currentDraftData,
    setCurrentDraftData,
    selectedDraftId,
    setSelectedDraftId
  } = useScheduleGenerationContext();
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  /**
   * Handle generating a new draft schedule.
   */
  const generateSchedule = async (
    config: GenerateConfig,
    isRegen: boolean = false,
    regenDates: string[] = []
  ): Promise<void> => {
    if (config.positionIds.length === 0) {
      toaster.create({ title: "No positions selected. Cannot generate.", type: "error" });
      return;
    }

    // If regenerating, ensure we actually have a draft and dates to work with
    if (isRegen && (!currentDraftData || regenDates.length === 0)) {
      toaster.create({ title: "Cannot regenerate without a valid draft and selected dates.", type: "error" });
      return;
    }

    setIsGenerating(true);
    setGenProgress(0);
    setGenStep(0);
    setGenTotal(0);
    setGenScore(0);

    // Only clear the current data if it's a brand-new generation
    if (!isRegen) {
      setCurrentDraftData(null);
      setSelectedDraftId(null);
    }

    try {
      // Build the frozen assignments array
      let frozenAssignments: Assignment[] = [];
      if (isRegen && currentDraftData) {
        // Keep every assignment except the selected regen dates.
        frozenAssignments = currentDraftData.assignments.filter(
          (assignment) => !regenDates.includes(assignment.date)
        );
      }

      const requestData: ScheduleRequest = {
        start_date: config.startDate,
        end_date: config.endDate,
        position_ids: config.positionIds,
        ignore_pending_timeoff: config.selectIgnorePending,
        min_days_off: config.minDaysOff,
        max_days_off: config.maxDaysOff,
        max_steps: config.maxSteps,
        frozen_assignments: frozenAssignments,
        skeleton: currentDraftData ? currentDraftData.assignments : [],
        templates: config.templates
      };

      const streamFunction = (requestData: ScheduleRequest,
        onProgress: (data: GenerationProgress) => void,
        onResult: (data: ScheduleResponse) => void,
        onError: (err: StreamError) => void
      ) => isRegen
            ? generateRegenStream(selectedDraftId!, requestData, onProgress, onResult, onError)
            : generateScheduleStream(requestData, onProgress, onResult, onError);

      await streamFunction(
        requestData,
        (progress) => {
          setGenProgress(progress.percent);
          setGenStep(progress.step);
          setGenTotal(progress.total);
          setGenScore(progress.current_score);
        },
        (result) => {
          setCurrentDraftData(result);

          const responseExtended = result as ScheduleResponse & { public_id?: string, id?: string, score?: number };
          const pubId = result.draft_id || responseExtended.public_id || responseExtended.id;
          const newSummary: DraftSummary = {
            public_id: pubId || "Undefined",
            created_at: result.created_at || new Date().toISOString(),
            start_date: config.startDate,
            end_date: config.endDate,
            score: result.final_score ?? responseExtended.score ?? -1
          };

          // Update draft summaries based on if it's a new draft or a regen
          if (isRegen) {
            // If the backend overwrites the existing draft, just update the summary in the list
            setDraftSummaries(prev => prev.map(draft => draft.public_id === pubId ? newSummary : draft));
          } else {
            // If it's a brand-new generation, add it to the top of the list
            setDraftSummaries(prev => [newSummary, ...prev]);
          }

          setSelectedDraftId(newSummary.public_id);
          setIsGenerating(false);
          setCalendarViewDate(parseDate(config.startDate));
          toaster.create({ title: isRegen ? "Schedule Regenerated!" : "Schedule Generated!", type: "success" });
        },
        (error) => {
          setIsGenerating(false);
          toaster.create({ title: "Generation Error", description: error.message, type: "error" });
        }
      );
    } catch (e) {
      console.error(e);
      setIsGenerating(false);
    }
  };

  /**
   * Loads a specific draft from history into the main view.
   */
  const selectDraft = async (id: string): Promise<ScheduleDraft | undefined> => {
    if (id === selectedDraftId) return; // Don't reload if already selected

    setSelectedDraftId(id);
    setIsLoadingDraft(true);
    setCurrentDraftData(null);

    try {
      const draft_data = await getScheduleDraftSchedule(id);
      setCurrentDraftData(draft_data);

      setStartDate(draft_data.start_date);
      setEndDate(draft_data.end_date);
      setCalendarViewDate(parseDate(draft_data.start_date));

      return draft_data;
    } catch {
      toaster.create({ title: "Could not load draft details", type: "error" });
    } finally {
      setIsLoadingDraft(false);
    }
  };

  /**
   * Intercepts edits from the DayEditModal, updates the UI,
   * and saves the changes to the backend database.
   */
  const updateCurrentDraft = async (updatedDraft: ScheduleResponse | ScheduleDraft | null | undefined) => {
    if (!updatedDraft) return;

    const previousData = currentDraftData;

    setCurrentDraftData(updatedDraft);

    if (selectedDraftId) {
      try {
        await updateDraft(selectedDraftId, updatedDraft.assignments);
      } catch {
        toaster.create({
          title: "Failed to save draft changes",
          description: "Your changes couldn't be saved to the database.",
          type: "error"
        });
        setCurrentDraftData(previousData);
      }
    }
  };

  /**
   * Generates a structural skeleton of empty shifts based on the date range.
   * (Currently mocked in frontend - will be moved to FastAPI backend later)
   */
  const buildSkeleton = (config: GenerateConfig, positions: PositionWithRequirementsRead[]) => {
    setIsGenerating(true);
    setCurrentDraftData(null);

    const emptyAssignments: Assignment[] = [];

    const [startYear, startMonth, startDay] = config.startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = config.endDate.split('-').map(Number);

    const currentDate = new Date(startYear, startMonth - 1, startDay);
    const endDateObj = new Date(endYear, endMonth - 1, endDay);

    const activePositions = positions.filter(p => config.positionIds.includes(p.id));

    // Loop through every single day in the range
    while (currentDate <= endDateObj) {
      const y = currentDate.getFullYear();
      const m = String(currentDate.getMonth() + 1).padStart(2, '0');
      const d = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const currentDayOfWeek = currentDate.getDay();
      const backendDayOfWeek = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

      activePositions.forEach(pos => {
        // Check if the position has templates assigned to it
        if (pos.requirements && pos.requirements.length > 0) {

          // Loop through all the rules for this specific position
          pos.requirements.forEach(req => {
            const template = req.shift_template;

            if (req.applies_on_days && req.applies_on_days.includes(backendDayOfWeek)) {
              const blocksToGenerate = req.is_fixed ? 1 : req.count;

              // Create an empty assignment block for every single required headcount!
              for(let i = 0; i < blocksToGenerate; i++) {
                 emptyAssignments.push({
                    date: dateStr,
                    start_time: template?.start_time,
                    end_time: template?.end_time,
                    is_fixed: req.is_fixed || false,
                    template_id: template?.id,
                    watchstander: {
                      id: 0,
                      name: req.is_fixed ? "Auto-Assigned" : "Unassigned",
                      offset: 0,
                      watchstations: []
                    },
                    watchstation: {
                      id: pos.id,
                      name: template ? `${pos.name} (${template.name})` : pos.name,
                      color: pos.color
                    }
                 });
              }
            }
          });

        }
      });

      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Set it to state so the calendar instantly renders the blocks
    setCurrentDraftData({
      // We purposefully DO NOT pass a public_id here.
      // That is how the UI knows this is just a Skeleton and not a saved Draft!
      start_date: config.startDate,
      end_date: config.endDate,
      created_at: new Date().toISOString(),
      assignments: emptyAssignments,
      final_score: 0,
      score_history: []
    } as ScheduleResponse);

    setIsGenerating(false);
    setCalendarViewDate(new Date(startYear, startMonth - 1, startDay));

    // Deselect any previously active draft in the sidebar
    setSelectedDraftId(null);

    toaster.create({
      title: "Skeleton Built!",
      description: "Review the shift blocks, then click Auto-Assign Names.",
      type: "success"
    });
  };

  return {
    isGenerating,
    genProgress,
    isLoadingDraft,
    currentDraftData,
    setCurrentDraftData,
    selectedDraftId,
    setSelectedDraftId,
    generateSchedule,
    selectDraft,
    updateCurrentDraft,
    buildSkeleton
  };
};