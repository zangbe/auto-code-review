// Octokit.js

// import { Octokit } from 'octokit';
console.log('start review');

const githubToken = process.env.GITHUB_TOKEN;
const prNumber = process.env.PR_NUMBER;
const repo = process.env.REPO;
const owner = process.env.OWNER;

console.log(`GITHUB_TOKEN: ${githubToken}`);
console.log(`PR_NUMBER: ${prNumber}`);
console.log(`REPO: ${repo}`);
console.log(`OWNER: ${owner}`);

// const octokit = new Octokit({
//   auth: '',
// });

// const result = await octokit.request(
//   'GET /repos/zangbe/auto-code-review/pulls/6',
//   {
//     owner: 'zangbe',
//     repo: 'auto-code-review',
//     pull_number: '6',
//     headers: {
//       'X-GitHub-Api-Version': '2022-11-28',
//     },
//   },
// );

// console.log({ result });
