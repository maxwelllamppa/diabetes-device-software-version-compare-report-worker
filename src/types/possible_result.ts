import { ErrorType } from './error_types.js'
import { Result } from '@teneo/rest-client'

export interface PossibleResult<T> {
  /**
   * The result of the request if it was successful.
   */
  result?: T
  /**
   * The error message if the request was not successful.
   */
  error?: string
  /**
   * The error details if the request was not successful.
   */
  errorDetails?: any
  /**
   * The status code of the request.
   */
  errorType?: ErrorType

  failure?: Result.Failure
}

export const createResultFailureMessage = (failure: Result.Failure, message: string): string => {
  if (!failure.errors || failure.errors.length === 0 || failure.errors[0].messages.length === 0) {
    return message
  }
  let errorMessage = ''
  for (const error of failure.errors) {
    if (!error.messages) {
      continue
    }
    for (const message of error.messages) {
      if (errorMessage) {
        errorMessage += ', '
      }
      errorMessage += message
    }
  }
  return `${message}: ${errorMessage ?? failure.statusCode}`
}

export const createPossibleResultError = (failure: Result.Failure, message: string): PossibleResult<any> => {
  const errorMessage = createResultFailureMessage(failure, message)
  return { error: errorMessage, failure }
}
