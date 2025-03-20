// No longer need to import OpenAI client since we're using our API route

export async function generateScript(carDetails: string, angleDescriptions: string[]): Promise<string> {
  try {
    console.log("Calling OpenAI API route to generate script");
    
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        carDetails,
        angleDescriptions,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error response from API route:", errorData);
      return `Error generating script: ${response.statusText}. Please try again.`;
    }
    
    const data = await response.json();
    return data.script || "Error generating script. Please try again.";
  } catch (error) {
    console.error("Error generating script:", error);
    if (error instanceof Error) {
      return `Error generating script: ${error.message}. Please try again.`;
    }
    return "Error generating script. Please try again.";
  }
} 