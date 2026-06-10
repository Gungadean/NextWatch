/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

import React from 'react';
import { Box, Flex, Progress, Text } from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router';
import { useScheduleGenerationContext } from '../context/ScheduleGenerationContext.tsx';
import { LuChevronDown, LuChevronUp } from 'react-icons/lu';

export const GenerationProgressOverlay: React.FC = () => {
  const { isGenerating, genProgress, genStep, genTotal, genScore, isOverlayMinimized, setIsOverlayMinimized, selectedDraftId } = useScheduleGenerationContext();
  const location = useLocation();
  const navigate = useNavigate();

  // Show overlay unless we are actively watching the main stage generation view
  const isBuilderPage = location.pathname === '/builder' || location.pathname === '/builder/';
  if (!isGenerating || (isBuilderPage && !selectedDraftId)) return null;

  return (
    <Box
      position="fixed"
      bottom="0"
      right="0"
      width={isOverlayMinimized ? "200px" : "300px"}
      bg="white"
      _dark={{ bg: "gray.800" }}
      boxShadow="lg"
      p="3"
      zIndex="toast"
      borderTopWidth="1px"
      borderLeftWidth="1px"
    >
      <Flex align="center" gap="2" mb={isOverlayMinimized ? 0 : 2}>
        <Box 
          as="button" 
          onClick={() => setIsOverlayMinimized(!isOverlayMinimized)}
          p="1"
          cursor="pointer"
          color="gray.500"
          _hover={{ color: 'blue.500' }}
        >
          {isOverlayMinimized ? <LuChevronUp size="16px" /> : <LuChevronDown size="16px" />}
        </Box>
        <Text
          fontWeight="bold"
          fontSize="sm"
          onClick={() => navigate('/builder')}
          cursor="pointer"
          _hover={{ textDecoration: 'underline' }}
        >
          {isOverlayMinimized ? (genProgress === 0 ? "Analyzing Feasibility..." : `Generating... ${genProgress}%`) : (genProgress === 0 ? "Analyzing Feasibility..." : "Generating Draft...")}
        </Text>
      </Flex>
      
      {!isOverlayMinimized && (
        <Box mt="3">
          <Flex justify="space-between" fontSize="xs" color="gray.500" mb="1">
            <Text>Step {genStep} of {genTotal}</Text>
            <Text>Score: {genScore}</Text>
          </Flex>
          <Progress.Root value={genProgress === 0 ? null : genProgress} size="md" colorPalette="blue" h="2" w="100%" striped animated>
            <Progress.Track>
              <Progress.Range transition={genProgress === 0 ? "none" : "width 0.3s ease-in-out"} />
            </Progress.Track>
          </Progress.Root>
        </Box>
      )}
    </Box>
  );
};
