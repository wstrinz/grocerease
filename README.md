
# GrocerEase

## NO TIME TO WRITE A PROPER README, SO EVERYTHING BELOW WAS GENERATED BY GPT-4 AND MAY BE TOTALLY INACCURATE!

This guide provides instructions for setting up the Grocery List App in a local development environment. This app is a web-based tool that allows users to upload images of their handwritten grocery lists, which are then transcribed and organized into a structured format.

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- Redis server
- An OpenAI API key

## Installation Steps

1. **Clone the Repository**

   Clone the repository to your local machine using the following command:
   ```bash
   git clone [repository-url]
   ```

2. **Install Dependencies**

   Navigate to the cloned directory and install the necessary Node.js packages:
   ```bash
   cd [repository-directory]
   npm install
   ```

3. **Set Up Environment Variables**

   Create a `.env` file in the root directory of the project and add the following variables:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=your_redis_password
   SECRET_KEY_BASE=your_secret_key
   BASIC_AUTH_USERNAME=your_username
   BASIC_AUTH_PASSWORD=your_password
   OPENAI_API_KEY=your_openai_api_key
   ```

   Replace `your_redis_password`, `your_secret_key`, `your_username`, `your_password`, and `your_openai_api_key` with your Redis password, a secret key for sessions, basic authentication credentials, and your OpenAI API key, respectively.

4. **Start Redis Server**

   Ensure that your Redis server is running. You can start Redis using the following command:
   ```bash
   redis-server
   ```

5. **Run the Application**

   Start the server by running:
   ```bash
   npm start
   ```

   By default, the server will start on `http://localhost:3000`.

6. **Access the Application**

   Open a web browser and navigate to `http://localhost:3000` to use the app.

## Additional Information

- The application uses Express.js for the backend and Bulma CSS for frontend styling.
- The AI transcription feature utilizes OpenAI's GPT model. Ensure you have a valid OpenAI API key in your `.env` file.
- Redis is used for session storage and management. Make sure your Redis server details in the `.env` file match your local Redis configuration.

## Troubleshooting

- If you encounter issues connecting to Redis, verify that the Redis server is running and the `.env` file contains the correct host, port, and password.
- For problems related to the OpenAI API, check if the API key is valid and properly set in the `.env` file.

Feel free to open an issue on the repository if you encounter any problems not covered in this guide.
