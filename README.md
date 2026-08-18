# Google Play Market mini parser

This a small part of my pet project that i always wanted to create. A personal parser to get info about play market game and its keywords. Getting semantic core of the game and findout rank of this game by each keyword. For example - how far my game X by keyword W from the top of the google play market page. With this simple application you can track position of keywords from day to day and monitor degradation or upgrade in rankings. Currently manually, you need to launch parser every day.

# Stack

- React TS
- Zustand
- Tenstack Query
- Node.js
- Playwright (will switch to Puppeteer in future, need lightweight solution)
- Vite
- Tailwind CSS

# What it do

When you add a link to your game - node.js lauches Playwright to crawl google play page and get info about your game. It's stored in your browser local storage for the moment. Then you press "Add keywords" and fill modal window with keywords that you think you need. Then you press "Parse" and parser starts another session of crawling by each keyword and trying to find your game. If it's founded - place is recorded and displayed in table.
