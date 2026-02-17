/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

import type {AuthRequest} from "./authApi.ts";

/**
 * authValidation.ts
 *
 * Handles validating username, email, and password inputs for login and register forms.
 */

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_]+$/;

/**
 * Payload we send to /auth/register login.
 */
export interface AuthSignInData {
  identifier: string;
  password: string;
  type: "username" | "email";
}
/**
 * Payload we send to /auth/register for creating a new user.
 */
export interface AuthSignUpData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Payload we send to /account/change-password to change a user's password.
 */
export interface PasswordUpdateData {
  password: string;
  confirmPassword: string;
}

/**
 * Use regexes to determine if login is of type username or email.
 */
export const determineLoginType = (login: string) => {
  const trimmed_login = login.trim();

  if (emailRegex.test(trimmed_login)) {
    return "email";
  } else {
    return "username";
  }
}

/**
 * Validate a username against regex to ensure only allowed characters are used.
 */
export const validateUsername = (username: string) => {
  const errors: Record<string, string> = {};

  if (!username) {
    errors.username = "Username is required";
  }

  if (!usernameRegex.test(username)) {
    errors.username = "Invalid characters. Please use only the following: a-zA-Z0-9_";
  }

  return errors;
}

/**
 * Validate an email address against regex to ensure it's in the correct format.
 */
export const validateEmail = (email: string) => {
  const errors: Record<string, string> = {};

  if (!email) {
    errors.email = "Email is required";
  } else {
    if (!emailRegex.test(email)) {
      errors.email = "Invalid email format";
    }
  }

  return errors;
}

/**
 * Take login request and validate if there's any errors in any of the form's fields
 */
export const validateSignIn = (data: AuthRequest) => {
  let errors: Record<string, string> = {};
  const identifier = data.identifier.trim();

  if (determineLoginType(identifier) === "email") {
      errors = {...errors, ...validateEmail(identifier)};
  } else {
      errors = {...errors, ...validateUsername(identifier)};
  }

  if (!data.password) {
    errors.password = "Password is required";
  }

  return errors;
};

/**
 * Validate that the two supplied passwords match (for sign up or password change)
 */
export const validatePasswords = (data: PasswordUpdateData) => {
  const errors: Record<string, string> = {};
  const password = data.password.trim();
  const confirmPassword = data.confirmPassword.trim();

  if (!password && !confirmPassword) {
    errors.confirmPassword = "";
  } else if (password && !confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }
  return errors;
}

/**
 * Take registration request and validate if there's any errors in any of the form's fields
 */
export const validateSignUp = (data: AuthSignUpData) => {
  let errors: Record<string, string> = {};
  const trimmed_user = data.username.trim();
  const trimmed_email = data.email.trim();

  errors = {...errors, ...validateEmail(trimmed_email)};
  errors = {...errors, ...validateUsername(trimmed_user)};
  errors = {...errors, ...validatePasswords({password: data.password, confirmPassword: data.confirmPassword})}

  return errors;
};
