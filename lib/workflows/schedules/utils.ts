/**
 * Schedule utility functions — copied from Sim's lib/workflows/schedules/utils.ts
 * Only import path changes applied.
 */
import { createLogger } from '@/lib/sim/logger'
import cronstrue from 'cronstrue'
import { Cron } from 'croner'

const logger = createLogger('ScheduleUtils')

export function validateCronExpression(
  cronExpression: string,
  timezone?: string
): {
  isValid: boolean
  error?: string
  nextRun?: Date
} {
  if (!cronExpression?.trim()) {
    return {
      isValid: false,
      error: 'Cron expression cannot be empty',
    }
  }

  try {
    const cron = new Cron(cronExpression, timezone ? { timezone } : undefined)
    const nextRun = cron.nextRun()

    if (!nextRun) {
      return {
        isValid: false,
        error: 'Cron expression produces no future occurrences',
      }
    }

    return {
      isValid: true,
      nextRun,
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid cron expression syntax',
    }
  }
}

export interface SubBlockValue {
  value: string
}

export interface BlockState {
  type: string
  subBlocks: Record<string, SubBlockValue | any>
  [key: string]: any
}

export const DAY_MAP: Record<string, number> = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 0,
}

export function getSubBlockValue(block: BlockState, id: string): string {
  const subBlock = block.subBlocks[id] as SubBlockValue | undefined
  return subBlock?.value || ''
}

export function parseTimeString(timeString: string | undefined | null): [number, number] {
  if (!timeString || !timeString.includes(':')) {
    return [9, 0]
  }

  const [hours, minutes] = timeString.split(':').map(Number)
  return [Number.isNaN(hours) ? 9 : hours, Number.isNaN(minutes) ? 0 : minutes]
}

export function getScheduleTimeValues(starterBlock: BlockState): {
  scheduleTime: string
  scheduleStartAt?: string
  minutesInterval: number
  hourlyMinute: number
  dailyTime: [number, number]
  weeklyDay: number
  weeklyTime: [number, number]
  monthlyDay: number
  monthlyTime: [number, number]
  cronExpression: string | null
  timezone: string
} {
  const scheduleTime = getSubBlockValue(starterBlock, 'scheduleTime')
  const scheduleStartAt = getSubBlockValue(starterBlock, 'scheduleStartAt')
  const timezone = getSubBlockValue(starterBlock, 'timezone') || 'UTC'
  const minutesIntervalStr = getSubBlockValue(starterBlock, 'minutesInterval')
  const minutesInterval = Number.parseInt(minutesIntervalStr) || 15
  const hourlyMinuteStr = getSubBlockValue(starterBlock, 'hourlyMinute')
  const hourlyMinute = Number.parseInt(hourlyMinuteStr) || 0
  const dailyTime = parseTimeString(getSubBlockValue(starterBlock, 'dailyTime'))
  const weeklyDayStr = getSubBlockValue(starterBlock, 'weeklyDay') || 'MON'
  const weeklyDay = DAY_MAP[weeklyDayStr] || 1
  const weeklyTime = parseTimeString(getSubBlockValue(starterBlock, 'weeklyDayTime'))
  const monthlyDayStr = getSubBlockValue(starterBlock, 'monthlyDay')
  const monthlyDay = Number.parseInt(monthlyDayStr) || 1
  const monthlyTime = parseTimeString(getSubBlockValue(starterBlock, 'monthlyTime'))
  const cronExpression = getSubBlockValue(starterBlock, 'cronExpression') || null

  return {
    scheduleTime,
    scheduleStartAt,
    timezone,
    minutesInterval,
    hourlyMinute,
    dailyTime,
    weeklyDay,
    weeklyTime,
    monthlyDay,
    monthlyTime,
    cronExpression,
  }
}

export function createDateWithTimezone(
  dateInput: string | Date,
  timeStr: string,
  timezone = 'UTC'
): Date {
  try {
    const baseDate = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput)
    const [targetHours, targetMinutes] = parseTimeString(timeStr)

    const year = baseDate.getUTCFullYear()
    const monthIndex = baseDate.getUTCMonth()
    const day = baseDate.getUTCDate()

    const tentativeUTCDate = new Date(
      Date.UTC(year, monthIndex, day, targetHours, targetMinutes, 0)
    )

    if (timezone === 'UTC') {
      return tentativeUTCDate
    }

    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })

    const parts = formatter.formatToParts(tentativeUTCDate)
    const getPart = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value

    const formattedYear = Number.parseInt(getPart('year') || '0', 10)
    const formattedMonth = Number.parseInt(getPart('month') || '0', 10)
    const formattedDay = Number.parseInt(getPart('day') || '0', 10)
    const formattedHour = Number.parseInt(getPart('hour') || '0', 10)
    const formattedMinute = Number.parseInt(getPart('minute') || '0', 10)

    const actualLocalTimeInTargetZone = Date.UTC(
      formattedYear,
      formattedMonth - 1,
      formattedDay,
      formattedHour,
      formattedMinute,
      0
    )

    const intendedLocalTimeAsUTC = Date.UTC(year, monthIndex, day, targetHours, targetMinutes, 0)
    const offsetMilliseconds = intendedLocalTimeAsUTC - actualLocalTimeInTargetZone
    const finalUTCTimeMilliseconds = tentativeUTCDate.getTime() + offsetMilliseconds
    const finalDate = new Date(finalUTCTimeMilliseconds)

    return finalDate
  } catch (e) {
    logger.error('Error creating date with timezone:', e, { dateInput, timeStr, timezone })
    try {
      const baseDate = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput)
      const [hours, minutes] = parseTimeString(timeStr)
      const year = baseDate.getUTCFullYear()
      const monthIndex = baseDate.getUTCMonth()
      const day = baseDate.getUTCDate()
      return new Date(Date.UTC(year, monthIndex, day, hours, minutes, 0))
    } catch (fallbackError) {
      logger.error('Error during fallback date creation:', fallbackError)
      throw new Error(
        `Failed to create date with timezone (${timezone}): ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
      )
    }
  }
}

export function generateCronExpression(
  scheduleType: string,
  scheduleValues: ReturnType<typeof getScheduleTimeValues>
): string {
  switch (scheduleType) {
    case 'minutes':
      return `*/${scheduleValues.minutesInterval} * * * *`
    case 'hourly':
      return `${scheduleValues.hourlyMinute} * * * *`
    case 'daily': {
      const [hours, minutes] = scheduleValues.dailyTime
      return `${minutes} ${hours} * * *`
    }
    case 'weekly': {
      const [hours, minutes] = scheduleValues.weeklyTime
      return `${minutes} ${hours} * * ${scheduleValues.weeklyDay}`
    }
    case 'monthly': {
      const [hours, minutes] = scheduleValues.monthlyTime
      return `${minutes} ${hours} ${scheduleValues.monthlyDay} * *`
    }
    case 'custom': {
      if (!scheduleValues.cronExpression?.trim()) {
        throw new Error('Custom schedule requires a valid cron expression')
      }
      return scheduleValues.cronExpression
    }
    default:
      throw new Error(`Unsupported schedule type: ${scheduleType}`)
  }
}

export function calculateNextRunTime(
  scheduleType: string,
  scheduleValues: ReturnType<typeof getScheduleTimeValues>
): Date {
  const timezone = scheduleValues.timezone || 'UTC'
  const baseDate = new Date()

  if (scheduleValues.scheduleStartAt && scheduleValues.scheduleTime) {
    try {
      const combinedDate = createDateWithTimezone(
        scheduleValues.scheduleStartAt,
        scheduleValues.scheduleTime,
        timezone
      )
      if (combinedDate > baseDate) {
        return combinedDate
      }
    } catch (e) {
      logger.error('Error combining scheduled date and time:', e)
    }
  } else if (scheduleValues.scheduleStartAt) {
    try {
      const startAtStr = scheduleValues.scheduleStartAt
      const hasTimeComponent =
        startAtStr.includes('T') && (startAtStr.includes(':') || startAtStr.includes('.'))

      if (hasTimeComponent) {
        const startDate = new Date(startAtStr)
        if (startAtStr.endsWith('Z') && timezone === 'UTC') {
          if (startDate > baseDate) {
            return startDate
          }
        } else {
          const timeMatch = startAtStr.match(/T(\d{2}:\d{2})/)
          const timeStr = timeMatch ? timeMatch[1] : '00:00'
          const tzAwareDate = createDateWithTimezone(startAtStr.split('T')[0], timeStr, timezone)
          if (tzAwareDate > baseDate) {
            return tzAwareDate
          }
        }
      } else {
        const startDate = createDateWithTimezone(scheduleValues.scheduleStartAt, '00:00', timezone)
        if (startDate > baseDate) {
          return startDate
        }
      }
    } catch (e) {
      logger.error('Error parsing scheduleStartAt:', e)
    }
  }

  try {
    const cronExpression = generateCronExpression(scheduleType, scheduleValues)
    const cron = new Cron(cronExpression, { timezone })
    const nextDate = cron.nextRun()

    if (!nextDate) {
      throw new Error(`No next run date calculated for cron: ${cronExpression}`)
    }

    return nextDate
  } catch (error) {
    logger.error('Error calculating next run with Croner:', error)
    throw new Error(
      `Failed to calculate next run time for schedule type ${scheduleType}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

function getTimezoneAbbreviation(timezone: string): string {
  if (timezone === 'UTC') return 'UTC'

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    })
    const parts = formatter.formatToParts(new Date())
    const tzPart = parts.find((p) => p.type === 'timeZoneName')
    return tzPart?.value || timezone
  } catch {
    return timezone
  }
}

/**
 * Convert a cron expression to a human-readable string.
 *
 * @param cronExpression - The cron expression to parse
 * @param timezone - Optional IANA timezone string to include in the description
 * @returns Human-readable description of the schedule
 */
export const parseCronToHumanReadable = (cronExpression: string, timezone?: string): string => {
  try {
    const baseDescription = cronstrue
      .toString(cronExpression, {
        use24HourTimeFormat: false,
        verbose: false,
      })
      .replace(/\b0(\d:\d{2})/g, '$1')

    if (timezone && timezone !== 'UTC') {
      const tzAbbr = getTimezoneAbbreviation(timezone)
      return `${baseDescription} (${tzAbbr})`
    }

    return baseDescription
  } catch (error) {
    logger.warn('Failed to parse cron expression with cronstrue:', {
      cronExpression,
      error: error instanceof Error ? error.message : String(error),
    })
    return `Schedule: ${cronExpression}${timezone && timezone !== 'UTC' ? ` (${getTimezoneAbbreviation(timezone)})` : ''}`
  }
}
