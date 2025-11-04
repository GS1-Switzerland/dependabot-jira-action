import * as process from 'process'
import {expect, test} from '@jest/globals'
import {getJiraApiUrlV3} from '../src/jira'
import {createIssueNumberString, extractIssueNumber} from '../src/actions'

test('test create jira api url', async () => {
  const subdomain = 'test-domain'
  const path = '/tester'
  process.env['JIRA_SUBDOMAIN'] = subdomain
  expect(getJiraApiUrlV3(path)).toEqual(
    `https://${subdomain}.atlassian.net/rest/api/3${path}`
  )
})

test('extra issue number from description', async () => {
  const issueNumber = '42'
  const issueNumberString = createIssueNumberString(issueNumber.toString())
  const issueNumberExtracted = extractIssueNumber(`
    ${issueNumberString}
  `)
  expect(issueNumberExtracted).toEqual(issueNumber)
})
