import { FertilityForecast } from '../types';

/**
 * Calculates the fertility forecast, ovulation date, and fertile window 
 * based on the last period start date and average cycle length.
 */
export function calculateFertilityForecast(
  lastPeriodStartDate: string,
  averageCycleLength: number = 28
): FertilityForecast {
  const lastPeriod = new Date(lastPeriodStartDate);
  
  // Next cycle start date
  const nextCycle = new Date(lastPeriod);
  nextCycle.setDate(lastPeriod.getDate() + averageCycleLength);

  // Ovulation typically occurs 14 days before the next expected period
  const ovulationDate = new Date(nextCycle);
  ovulationDate.setDate(nextCycle.getDate() - 14);

  // Fertile window: 5 days leading up to and including ovulation day
  const fertileWindowStart = new Date(ovulationDate);
  fertileWindowStart.setDate(ovulationDate.getDate() - 5);

  const fertileWindowEnd = new Date(ovulationDate);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  return {
    nextCycleStart: formatDate(nextCycle),
    ovulationDate: formatDate(ovulationDate),
    fertileWindowStart: formatDate(fertileWindowStart),
    fertileWindowEnd: formatDate(fertileWindowEnd),
    averageCycleLength,
  };
}
