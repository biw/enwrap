/**
 * Helper function to get the line number of the error.
 *
 * This is useful for debugging/testing, as it allows us to see the exact line
 * that the error occurred on.
 *
 * **This should only be used for testing purposes and internally to enwrap,
 * please don't use this function directly.**
 */
export const getParsedStack = (
  e: Error | undefined,
  // if we parse the error in the file, we want to pop off the first line
  // since the first line points to the library code, not the user's code
  popOffStack = true,
) => {
  const lines = (e?.stack?.split('\n') || []).filter((_, i) =>
    popOffStack ? i !== 1 : true,
  )

  const firstLine = lines[1]
  if (!firstLine) return null
  const colonSplit = firstLine.split(':')
  const colon = colonSplit[colonSplit.length - 2]

  const editedStack = lines.join('\n')
  return {
    editedStack,
    lineNumber: colon,
    // files,
  }
}
