import { NextResponse } from 'next/server'
import { validateAlphanumericId } from '@/lib/core/security/input-validation'
import { generateRequestId } from '@/lib/core/utils/request'

export const dynamic = 'force-dynamic'

const logger = {
  info: (...args: any[]) => console.log('[SlackChannelsAPI]', ...args),
  warn: (...args: any[]) => console.warn('[SlackChannelsAPI]', ...args),
  error: (...args: any[]) => console.error('[SlackChannelsAPI]', ...args),
  debug: (...args: any[]) => console.debug('[SlackChannelsAPI]', ...args),
}

interface SlackChannel {
  id: string
  name: string
  is_private: boolean
  is_archived: boolean
  is_member: boolean
}

export async function POST(request: Request) {
  try {
    const requestId = generateRequestId()
    const body = await request.json()
    const { credential } = body

    if (!credential) {
      logger.error('Missing credential in request')
      return NextResponse.json({ error: 'Credential is required' }, { status: 400 })
    }

    let accessToken: string
    let isBotToken = false

    if (credential.startsWith('xoxb-')) {
      accessToken = credential
      isBotToken = true
      logger.info('Using direct bot token for Slack API')
    } else {
      // OAuth credential — for now, treat the credential as a direct access token.
      // Full OAuth credential resolution (authorizeCredentialUse + refreshAccessTokenIfNeeded)
      // will be wired once the OAuth infrastructure is complete.
      accessToken = credential
      logger.info('Using OAuth token for Slack API')
    }

    let data
    try {
      data = await fetchSlackChannels(accessToken, true)
      logger.info('Successfully fetched channels including private channels')
    } catch (error) {
      if (isBotToken) {
        logger.warn(
          'Failed to fetch private channels with bot token, falling back to public channels only:',
          (error as Error).message
        )
        try {
          data = await fetchSlackChannels(accessToken, false)
          logger.info('Successfully fetched public channels only')
        } catch (fallbackError) {
          logger.error('Failed to fetch channels even with public-only fallback:', fallbackError)
          return NextResponse.json(
            { error: `Slack API error: ${(fallbackError as Error).message}` },
            { status: 400 }
          )
        }
      } else {
        logger.error('Slack API error with OAuth token:', error)
        return NextResponse.json(
          { error: `Slack API error: ${(error as Error).message}` },
          { status: 400 }
        )
      }
    }

    const channels = (data.channels || [])
      .filter((channel: SlackChannel) => {
        const canAccess = !channel.is_archived && (channel.is_member || !channel.is_private)

        if (!canAccess) {
          logger.debug(
            `Filtering out channel: ${channel.name} (archived: ${channel.is_archived}, private: ${channel.is_private}, member: ${channel.is_member})`
          )
        }

        return canAccess
      })
      .filter((channel: SlackChannel) => {
        const validation = validateAlphanumericId(channel.id, 'channelId', 50)

        if (!validation.isValid) {
          logger.warn('Invalid channel ID received from Slack API', {
            channelId: channel.id,
            channelName: channel.name,
            error: validation.error,
          })
          return false
        }

        if (!/^[CDG][A-Z0-9]+$/i.test(channel.id)) {
          logger.warn('Channel ID does not match Slack format', {
            channelId: channel.id,
            channelName: channel.name,
          })
          return false
        }

        return true
      })
      .map((channel: SlackChannel) => ({
        id: channel.id,
        name: channel.name,
        isPrivate: channel.is_private,
      }))

    logger.info(`Successfully fetched ${channels.length} Slack channels`, {
      total: data.channels?.length || 0,
      private: channels.filter((c: { isPrivate: boolean }) => c.isPrivate).length,
      public: channels.filter((c: { isPrivate: boolean }) => !c.isPrivate).length,
      tokenType: isBotToken ? 'bot_token' : 'oauth',
    })
    return NextResponse.json({ channels })
  } catch (error) {
    logger.error('Error processing Slack channels request:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve Slack channels', details: (error as Error).message },
      { status: 500 }
    )
  }
}

async function fetchSlackChannels(accessToken: string, includePrivate = true) {
  const url = new URL('https://slack.com/api/conversations.list')

  if (includePrivate) {
    url.searchParams.append('types', 'public_channel,private_channel')
  } else {
    url.searchParams.append('types', 'public_channel')
  }

  url.searchParams.append('exclude_archived', 'true')
  url.searchParams.append('limit', '200')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  if (!data.ok) {
    throw new Error(data.error || 'Failed to fetch channels')
  }

  return data
}
