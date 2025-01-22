import {getDependabotOpenPullRequests, PullRequest} from './github'
import {createJiraIssue} from './jira'
import * as core from '@actions/core'

export interface SyncJiraOpen {
  repo: string
  owner: string
  label: string
  projectKey: string
  issueType: string
  transitionDoneName?: string
}

export function extractIssueNumber(description: string): string {
  const issueNumberRegex = /PULL_NUMBER_(.*)_PULL_NUMBER/g
  const parts = issueNumberRegex.exec(description)
  if (parts && parts.length > 1) {
    return parts[1]
  } else {
    return '-1'
  }
}

export function createIssueNumberString(pullNumber: string): string {
  return `PULL_NUMBER_${pullNumber}_PULL_NUMBER`
}

export async function syncJiraWithOpenDependabotPulls(
  params: SyncJiraOpen
): Promise<string> {
  try {
    core.setOutput(
      'Sync jira with open dependabot pulls starting',
      new Date().toTimeString()
    )
    // destructure params object
    const {repo, owner, label, projectKey, issueType} = params
    // get open dependabot PRs
    core.info('Start GitHub PR request')
    const dependabotPulls: PullRequest[] = await getDependabotOpenPullRequests({
      repo,
      owner
    })
    core.info('Start creating Jira issues')
    // create Jira Issue for each PR
    for (const pull of dependabotPulls) {
      await createJiraIssue({
        label,
        projectKey,
        issueType,
        ...pull
      })
    }
    core.info('Successfully created Jira issues')
    core.setOutput(
      'Sync jira with open dependabot pulls success',
      new Date().toTimeString()
    )
    return 'success'
  } catch (e) {
    throw e
  }
}
