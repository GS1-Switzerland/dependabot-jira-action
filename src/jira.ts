import * as core from '@actions/core'
import fetch, {HeaderInit, RequestInit, Response} from 'node-fetch'
import {createIssueNumberString} from './actions'

interface ApiPostParams {
  url: string
  data: object
}

interface ApiRequestResponse {
  data: object
}

interface ApiRequestSearchResponse {
  issues: object[]
}
interface SearchIssue {
  jql: string
}

export interface CreateIssue {
  label: string
  projectKey: string
  summary: string
  description: string
  issueType: string
  url: string
  repoName: string
  repoUrl: string
  lastUpdatedAt: string
  pullNumber: string
}

function getJiraAuthorizedHeader(): HeaderInit {
  const email = process.env.JIRA_USER_EMAIL
  const token = process.env.JIRA_API_TOKEN
  core.info(`email ${email}`)
  const authorization = Buffer.from(`${email}:${token}`).toString('base64')
  return {
    Authorization: `Basic ${authorization}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
}

export function getJiraApiUrlV3(path = '/'): string {
  const subdomain = process.env.JIRA_SUBDOMAIN
  return `https://${subdomain}.atlassian.net/rest/api/3${path}`
}

async function jiraApiPost(params: ApiPostParams): Promise<ApiRequestResponse> {
  try {
    const {url, data} = params
    console.log(getJiraAuthorizedHeader())
    console.log(JSON.stringify(data))
    const fetchParams: RequestInit = {
      body: JSON.stringify(data),
      headers: getJiraAuthorizedHeader(),
      method: 'POST'
    }
    const response: Response = await fetch(url, fetchParams)
    console.log(response)
    if (response.status === 201) {
      const responseData = await response.json()
      return {data: responseData}
    } else {
      const error = await response.json()
      const errors = Object.values(error.errors)
      const message = errors.join(',')
      console.log('Error:', message)
      throw Error(message)
    }
  } catch (e: any) {
    console.error(e.message)
    throw new Error('Post error')
  }
}

export async function jiraApiSearch({
  jql
}: SearchIssue): Promise<ApiRequestSearchResponse> {
  try {
    const getUrl = getJiraApiUrlV3('/search')
    core.info(`JQL: ${jql}`)

    const body = {
      jql,
      maxResults: 1000,
      fields: ['*all']
    }

    const requestParams: RequestInit = {
      method: 'POST',
      headers: getJiraAuthorizedHeader(),
      body: JSON.stringify(body)
    }

    const response = await fetch(getUrl, requestParams)
    const text = await response.text() // safer to debug
    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      core.error(`Jira did not return valid JSON: ${text}`)
      throw new Error('Invalid JSON response from Jira')
    }

    if (response.ok) {
      return data
    } else {
      const message = data.errorMessages?.join(', ') || JSON.stringify(data)
      throw new Error(`Jira search failed: ${message}`)
    }
  } catch (e: any) {
    core.error(`Error getting the existing issue: ${e.message}`)
    throw e
  }
}

export async function createJiraIssue({
  label,
  projectKey,
  summary,
  issueType = 'Bug',
  repoName,
  repoUrl,
  url,
  lastUpdatedAt,
  pullNumber
}: CreateIssue): Promise<ApiRequestResponse> {
  const jql = `description~"${createIssueNumberString(
    pullNumber
  )}' AND labels='${label}' AND project='${projectKey}' AND issuetype='${issueType}'`
  const existingIssuesResponse = await jiraApiSearch({
    jql
  })
  if (
    existingIssuesResponse &&
    existingIssuesResponse.issues &&
    existingIssuesResponse.issues.length > 0
  ) {
    core.debug(`Has existing issue skipping`)
    return {data: existingIssuesResponse.issues[0]}
  }
  core.debug(`Did not find exising, trying create`)
  const body = {
    fields: {
      labels: [label],
      project: {
        key: projectKey
      },
      summary,
      description: {
        content: [
          {
            content: [
              {
                text: `Application repo: ${repoName}`,
                type: 'text'
              }
            ],
            type: 'paragraph'
          },
          {
            content: [
              {
                text: `Application url: ${repoUrl}`,
                type: 'text'
              }
            ],
            type: 'paragraph'
          },
          {
            content: [
              {
                text: `Pull request last updated at: ${lastUpdatedAt}`,
                type: 'text'
              }
            ],
            type: 'paragraph'
          },
          {
            content: [
              {
                text: `Pull request url: ${url}`,
                type: 'text'
              }
            ],
            type: 'paragraph'
          },
          {
            content: [
              {
                text: createIssueNumberString(pullNumber),
                type: 'text'
              }
            ],
            type: 'paragraph'
          }
        ],
        type: 'doc',
        version: 1
      },
      issuetype: {
        name: issueType
      }
    },
    update: {}
  }
  const data = await jiraApiPost({
    url: getJiraApiUrlV3('/issue'),
    data: body
  })
  core.info(`Create issue success`)
  return {data}
}
