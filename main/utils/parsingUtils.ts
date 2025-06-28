// utils/parsingUtils.ts

/**
 * Parses a commitment string (e.g., "1-3 hours per week") into average weekly hours.
 * @param commitmentStr The commitment string from UserChoices.
 * @returns Average weekly hours as a number.
 */
export const parseCommitmentToAvgHours = (commitmentStr: string | undefined): number => {
  if (!commitmentStr) return 3; // Default average if undefined

  const lowerStr = commitmentStr.toLowerCase();

  if (lowerStr.includes("1-3 hours")) return 2;
  if (lowerStr.includes("4-6 hours")) return 5;
  if (lowerStr.includes("7+ hours") || lowerStr.includes("7 hours") || lowerStr.includes("intensively")) return 8; // Max for 7+
  if (lowerStr.includes("casually")) return 2; 
  if (lowerStr.includes("regularly")) return 5; 
  
  // Fallback for simple number extraction if pattern is different
  const match = lowerStr.match(/(\d+)/);
  if (match && match[1]) {
    const hours = parseInt(match[1], 10);
    if (!isNaN(hours)) return Math.min(hours, 10); // Cap at a reasonable max like 10 for safety
  }
  
  return 4; // Adjusted default average if no specific match
};

/**
 * Parses a duration string (e.g., "a 2-week course", "1 month") into total days.
 * @param durationStr The duration string from UserChoices.
 * @returns Total course duration in days.
 */
export const parseDurationToTotalDays = (durationStr: string | undefined): number => {
  if (!durationStr) return 14; // Default average if undefined (e.g., 2 weeks)

  const lowerStr = durationStr.toLowerCase();

  // Handle "X-Y unit" pattern first
  const rangeMatch = lowerStr.match(/(\d+)\s*-\s*(\d+)\s*(week|weeks|month|months)/);
  if (rangeMatch) {
    const val1 = parseInt(rangeMatch[1], 10);
    const val2 = parseInt(rangeMatch[2], 10);
    const unit = rangeMatch[3];
    const avgVal = (val1 + val2) / 2;

    if (unit.startsWith("week")) return Math.round(avgVal * 7);
    if (unit.startsWith("month")) return Math.round(avgVal * 30.44); 
  }
  
  // Handle "X unit" pattern
  const singleMatch = lowerStr.match(/(\d+)\s*(week|weeks|month|months|day|days)/);
  if (singleMatch) {
    const val = parseInt(singleMatch[1], 10);
    const unit = singleMatch[2];

    if (unit.startsWith("week")) return val * 7;
    if (unit.startsWith("month")) return Math.round(val * 30.44);
    if (unit.startsWith("day")) return val;
  }
  
  // Handle specific phrases without numbers like "a ... sprint (e.g. 1 week)"
  if (lowerStr.includes("sprint") && (lowerStr.includes("1 week") || lowerStr.includes("one week"))) return 7;
  if (lowerStr.includes("weekend sprint")) return 3; 
  if (lowerStr.includes("standard course") && (lowerStr.includes("2-4 weeks"))) return 21; 
  if (lowerStr.includes("deep-dive") && (lowerStr.includes("1-2 months"))) return 45; 


  // More general phrases if numeric parsing failed
  if (lowerStr.includes("one week") || lowerStr.includes("1 week")) return 7;
  if (lowerStr.includes("two weeks") || lowerStr.includes("2 weeks")) return 14;
  if (lowerStr.includes("three weeks") || lowerStr.includes("3 weeks")) return 21;
  if (lowerStr.includes("four weeks") || lowerStr.includes("4 weeks")) return 28;
  if (lowerStr.includes("one month") || lowerStr.includes("1 month")) return 30;
  if (lowerStr.includes("two months") || lowerStr.includes("2 months")) return 60;
  

  return 21; // Adjusted default if no pattern matches (e.g., 3 weeks as a general medium)
};