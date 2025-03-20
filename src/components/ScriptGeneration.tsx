"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { generateScript } from "@/lib/openai";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface ScriptGenerationProps {
  onScriptGenerated: () => void;
}

const formSchema = z.object({
  carDetails: z.string().min(10, {
    message: "Car details must be at least 10 characters long."
  })
});

export default function ScriptGeneration({ onScriptGenerated }: ScriptGenerationProps) {
  const { currentProject, setScriptData, setGeneratedScript } = useAppStore();
  const [generating, setGenerating] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      carDetails: currentProject?.scriptData || "",
    },
  });
  
  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentProject) return;
    
    setScriptData(currentProject.id, values.carDetails);
    setGenerating(true);
    
    try {
      // Get shot descriptions for context
      const shotDescriptions = currentProject.shots.map(shot => 
        `${shot.angle}: ${shot.description}`
      );
      
      // Generate script using OpenAI
      const script = await generateScript(values.carDetails, shotDescriptions);
      
      // Save the generated script
      setGeneratedScript(currentProject.id, script);
      toast.success("Script generated successfully!");
      onScriptGenerated();
    } catch (error) {
      console.error("Error generating script:", error);
      toast.error("Failed to generate script. Please try again.");
    } finally {
      setGenerating(false);
    }
  }
  
  const handleAutoFill = () => {
    if (!currentProject) return;
    
    const demoCarDetails = 
      `${currentProject.carId}\n\n` +
      `This luxury sedan features a sleek design with aerodynamic contours and premium finishes. ` +
      `Powered by a 3.0L turbocharged engine producing 335 horsepower and 369 lb-ft of torque. ` +
      `The interior boasts handcrafted leather seats, panoramic sunroof, and a 12.3-inch infotainment system with voice control. ` +
      `Safety features include adaptive cruise control, lane-keeping assist, and 360-degree camera system. ` +
      `Additional features: wireless charging, ambient lighting, premium sound system, and remote start capability.`;
    
    form.setValue("carDetails", demoCarDetails);
  };

  if (!currentProject) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Script Generation</h2>
        <Button variant="outline" size="sm" onClick={handleAutoFill}>
          Auto-fill Demo Data
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Car Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="carDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enter Car Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter detailed information about the car including model, features, specs, etc."
                        className="min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The more details you provide, the better the script will be.
                    </FormDescription>
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={generating}
              >
                {generating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Script...
                  </>
                ) : 'Generate Script'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {currentProject.generatedScript && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Script</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md whitespace-pre-wrap">
              {currentProject.generatedScript}
            </div>
            
            <Button
              className="w-full mt-4"
              onClick={onScriptGenerated}
            >
              Continue to Final Preview
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 