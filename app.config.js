import 'dotenv/config';

export default ({config}) => {
  // Read from local .env file in development
  const geminiApiKey = process.env.GEMINI_API_KEY || 'placeholder';
  
  return {
    ...config,
    extra: {
      ...config.extra,
      geminiApiKey
    }
  };
};