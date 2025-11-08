import * as core from '@actions/core'
import {getOctokit} from '@actions/github'

export interface GetPullRequestParams {
  owner: string
  repo: string
}
export interface PullRequest {
  url: string
  summary: string
  description: string
  repoName: string
  repoUrl: string
  lastUpdatedAt: string
  pullNumber: string
}

export async function getDependabotOpenPullRequests(
  params: GetPullRequestParams
): Promise<PullRequest[]> {
  const {owner, repo} = params
  const githubApiKey = process.env.GITHUB_API_TOKEN || ''
  const octokit = getOctokit(githubApiKey)
  const dependabotLoginName = 'dependabot[bot]'
  let response
  try {
    response = await octokit.request(
      'GET /repos/{owner}/{repo}/pulls?state=open',
      {
        owner,
        repo,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    )
  } catch (e) {
    const isErr = e instanceof Error
    if (isErr) {
      e.message = `GitHub Error: ${e.message} - failed PR request`
      throw e
    } else {
      throw e
    }
  }
  const {data} = response
  const items = []
  for (const pull of data) {
    if (pull?.user?.login === dependabotLoginName) {
      const item: PullRequest = {
        url: pull.html_url,
        summary: `${pull.title}`,
        description: pull.body,
        repoName: pull.base.repo.name,
        repoUrl: pull.base.repo.html_url.replace('***', owner),
        lastUpdatedAt: pull.updated_at,
        pullNumber: pull.number.toString()
      }
      items.push(item)
    }
  }
  core.info('Successfully got GitHub Pulls')
  return items
}
