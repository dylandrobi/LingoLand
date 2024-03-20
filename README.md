An engaging, real-time communication tool where users could practice languages with native speakers worldwide, enriching their linguistic skills and cultural understanding.
Users get matched with eachother based on their own fluent languages and their desired language that they want to practice!
Ex:
User 1 is fluent in English and Chinese, and they want to practice Spanish
User 2 is fluent in Spanish and wants to practice English.
--> User 1 and User 2 would be matched


*Notes: 
- This project is in its Beta stage. Only English, Spanish, and Chinese are language options, but the plan is to expand this list greatly.
- In its current version, this web app is designed to be used for people who have some experience in the language they plan to practice.

________________________________________
How to use:
After forking project...

npm install -D tailwindcss postcss autoprefixer

npm install mongodb@4.1

npm i agora-rtm-sdk

npm install next-auth mongoose

________________________________________

create .env file and fill in these fields:

MONGODB_URI=

NEXT_PUBLIC_AGORA_APP_ID=

AGORA_APP_CERT=

GOOGLE_ID=

GOOGLE_CLIENT_SECRET=

NEXTAUTH_URL=http://localhost:3000

NEXTAUTH_URL_INTERNAL=http://localhost:3000

NEXTAUTH_SECRET=

__________________________________________

Credits:
I would like to give credit to Cody Seibert, a YouTuber who ​​built an online video/text chat room using Next, Mongo, and Agora, and then created a YouTube video/course walking through the process. 
https://github.com/codyseibert/omegle-clone
https://www.youtube.com/watch?v=nfWs9v5cEb0
Following along through this video, I was able to incorporate his code into my project for the Agora chatting mechanism and Mongo data storage elements. It allowed me to easily integrate the Video chatting and Text chatting!

I would also like to give credit to JavaScript Mastery, another YouTuber who made a video called  “Next.js 14 Full Course 2024 | Build and Deploy a Full Stack App Using the Official React Framework”
https://github.com/adrianhajdin/project_next_14_ai_prompt_sharing
https://www.youtube.com/watch?v=wm5gMKuwSYk
This was another course that I followed along and took bits and pieces for my own project, specifically the Google Login and Authentication as well as better understanding the relationship between front end interfaces and back end database storage in MongoDB.


DESCRIPTION
ADD SCREENSHOT
GIVE CREDITS TO LAST PROJECTS


This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
