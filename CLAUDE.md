# CLAUDE.md - Agent Guidelines for Split

Mobile app called "Split." It is going to going to be built with React native and expo and have a very stylish, yet modern look to it. 

The purpose of the app is to be able to scan restaurant checks, and get the totals that each person owes the person who pays. This app should also be extremely intuitive and easy to use. There should be a brief landing page, where the user could then click "Start Splitting." This will then give then a clean UI to add people to their check, adding their names to a list (in addition to "me"). Then once the people are confirmed, the user can click next and it will open their camera and overlay a box to place the check in, then they can take the picture. This picture should then be uplaoded to the gemini API, where the LLM will parse the check with OCR, then give back a JSON object with information about how much each person owes "Me."


## Build & Test Commands
- Start development: `npm start` or `yarn start`
- Platform specific: `npm run ios|android|web`
- Run tests: `npm test` or `yarn test`
- Run single test: `npx jest path/to/test-file.test.tsx`
- Lint code: `npm run lint`
- Reset project: `npm run reset-project`

## Code Style Guidelines
- TypeScript with strict mode enabled
- Use explicit type annotations and interfaces
- Functional components with React hooks
- PascalCase for component names/files, camelCase for variables/functions
- Styles: Use `StyleSheet.create()` at bottom of component files
- Import order: React/RN first, then project imports
- Use absolute imports with `@/` path alias
- 2-space indentation, semicolons, single quotes
- Props interfaces at top of files
- Error handling with optional chaining and try/catch for async
- Component-specific tests in `__tests__` directories
- Theme-aware styling with light/dark mode support