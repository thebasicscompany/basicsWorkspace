// Core Data Operations

import { batchEventsTool } from '@/lib/sim/tools/posthog/batch_events'
import { captureEventTool } from '@/lib/sim/tools/posthog/capture_event'
import { createAnnotationTool } from '@/lib/sim/tools/posthog/create_annotation'
import { createCohortTool } from '@/lib/sim/tools/posthog/create_cohort'
import { createExperimentTool } from '@/lib/sim/tools/posthog/create_experiment'
import { createFeatureFlagTool } from '@/lib/sim/tools/posthog/create_feature_flag'
import { createInsightTool } from '@/lib/sim/tools/posthog/create_insight'
import { createSurveyTool } from '@/lib/sim/tools/posthog/create_survey'
import { deleteFeatureFlagTool } from '@/lib/sim/tools/posthog/delete_feature_flag'
import { deletePersonTool } from '@/lib/sim/tools/posthog/delete_person'
import { evaluateFlagsTool } from '@/lib/sim/tools/posthog/evaluate_flags'
import { getCohortTool } from '@/lib/sim/tools/posthog/get_cohort'
import { getDashboardTool } from '@/lib/sim/tools/posthog/get_dashboard'
import { getEventDefinitionTool } from '@/lib/sim/tools/posthog/get_event_definition'
import { getExperimentTool } from '@/lib/sim/tools/posthog/get_experiment'
import { getFeatureFlagTool } from '@/lib/sim/tools/posthog/get_feature_flag'
import { getInsightTool } from '@/lib/sim/tools/posthog/get_insight'
import { getOrganizationTool } from '@/lib/sim/tools/posthog/get_organization'
import { getPersonTool } from '@/lib/sim/tools/posthog/get_person'
import { getProjectTool } from '@/lib/sim/tools/posthog/get_project'
import { getPropertyDefinitionTool } from '@/lib/sim/tools/posthog/get_property_definition'
import { getSessionRecordingTool } from '@/lib/sim/tools/posthog/get_session_recording'
import { getSurveyTool } from '@/lib/sim/tools/posthog/get_survey'
import { listActionsTool } from '@/lib/sim/tools/posthog/list_actions'
import { listAnnotationsTool } from '@/lib/sim/tools/posthog/list_annotations'
import { listCohortsTool } from '@/lib/sim/tools/posthog/list_cohorts'
import { listDashboardsTool } from '@/lib/sim/tools/posthog/list_dashboards'
// Data Management
import { listEventDefinitionsTool } from '@/lib/sim/tools/posthog/list_event_definitions'
import { listExperimentsTool } from '@/lib/sim/tools/posthog/list_experiments'
// Feature Management
import { listFeatureFlagsTool } from '@/lib/sim/tools/posthog/list_feature_flags'
// Analytics
import { listInsightsTool } from '@/lib/sim/tools/posthog/list_insights'
import { listOrganizationsTool } from '@/lib/sim/tools/posthog/list_organizations'
import { listPersonsTool } from '@/lib/sim/tools/posthog/list_persons'
// Configuration
import { listProjectsTool } from '@/lib/sim/tools/posthog/list_projects'
import { listPropertyDefinitionsTool } from '@/lib/sim/tools/posthog/list_property_definitions'
import { listRecordingPlaylistsTool } from '@/lib/sim/tools/posthog/list_recording_playlists'
import { listSessionRecordingsTool } from '@/lib/sim/tools/posthog/list_session_recordings'
// Engagement
import { listSurveysTool } from '@/lib/sim/tools/posthog/list_surveys'
import { queryTool } from '@/lib/sim/tools/posthog/query'
import { updateEventDefinitionTool } from '@/lib/sim/tools/posthog/update_event_definition'
import { updateFeatureFlagTool } from '@/lib/sim/tools/posthog/update_feature_flag'
import { updatePropertyDefinitionTool } from '@/lib/sim/tools/posthog/update_property_definition'
import { updateSurveyTool } from '@/lib/sim/tools/posthog/update_survey'

// Export all tools with posthog prefix
export const posthogCaptureEventTool = captureEventTool
export const posthogBatchEventsTool = batchEventsTool
export const posthogListPersonsTool = listPersonsTool
export const posthogGetPersonTool = getPersonTool
export const posthogDeletePersonTool = deletePersonTool
export const posthogQueryTool = queryTool

export const posthogListInsightsTool = listInsightsTool
export const posthogGetInsightTool = getInsightTool
export const posthogCreateInsightTool = createInsightTool
export const posthogListDashboardsTool = listDashboardsTool
export const posthogGetDashboardTool = getDashboardTool
export const posthogListActionsTool = listActionsTool
export const posthogListCohortsTool = listCohortsTool
export const posthogGetCohortTool = getCohortTool
export const posthogCreateCohortTool = createCohortTool
export const posthogListAnnotationsTool = listAnnotationsTool
export const posthogCreateAnnotationTool = createAnnotationTool

export const posthogListFeatureFlagsTool = listFeatureFlagsTool
export const posthogGetFeatureFlagTool = getFeatureFlagTool
export const posthogCreateFeatureFlagTool = createFeatureFlagTool
export const posthogUpdateFeatureFlagTool = updateFeatureFlagTool
export const posthogDeleteFeatureFlagTool = deleteFeatureFlagTool
export const posthogEvaluateFlagsTool = evaluateFlagsTool
export const posthogListExperimentsTool = listExperimentsTool
export const posthogGetExperimentTool = getExperimentTool
export const posthogCreateExperimentTool = createExperimentTool

export const posthogListSurveysTool = listSurveysTool
export const posthogGetSurveyTool = getSurveyTool
export const posthogCreateSurveyTool = createSurveyTool
export const posthogUpdateSurveyTool = updateSurveyTool
export const posthogListSessionRecordingsTool = listSessionRecordingsTool
export const posthogGetSessionRecordingTool = getSessionRecordingTool
export const posthogListRecordingPlaylistsTool = listRecordingPlaylistsTool

export const posthogListEventDefinitionsTool = listEventDefinitionsTool
export const posthogGetEventDefinitionTool = getEventDefinitionTool
export const posthogUpdateEventDefinitionTool = updateEventDefinitionTool
export const posthogListPropertyDefinitionsTool = listPropertyDefinitionsTool
export const posthogGetPropertyDefinitionTool = getPropertyDefinitionTool
export const posthogUpdatePropertyDefinitionTool = updatePropertyDefinitionTool

export const posthogListProjectsTool = listProjectsTool
export const posthogGetProjectTool = getProjectTool
export const posthogListOrganizationsTool = listOrganizationsTool
export const posthogGetOrganizationTool = getOrganizationTool
