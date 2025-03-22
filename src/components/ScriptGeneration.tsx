"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { generateScript } from "@/lib/api-client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, RefreshCw, X } from "lucide-react";

interface ScriptGenerationProps {
  onScriptGenerated: () => void;
}

const formSchema = z.object({
  carDetails: z.string().min(10, {
    message: "Car details must be at least 10 characters long."
  }),
  generatedScript: z.string().optional()
});

export default function ScriptGeneration({ onScriptGenerated }: ScriptGenerationProps) {
  const { currentProject, setScriptData, setGeneratedScript } = useAppStore();
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      carDetails: currentProject?.scriptData || "",
      generatedScript: currentProject?.generatedScript || ""
    },
  });

  // Handle script generation
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentProject) return;
    
    setGenerating(true);
    try {
      // Save car details
      setScriptData(currentProject.id, values.carDetails);
      
      // Get shot descriptions for context
      const shotDescriptions = currentProject.shots.map(shot => 
        `${shot.angle}: ${shot.description}`
      );
      
      // Generate script using backend API
      const script = await generateScript({
        car_details: values.carDetails,
        angle_descriptions: shotDescriptions
      });
      
      // Save the generated script
      await setGeneratedScript(currentProject.id, script);
      form.setValue("generatedScript", script);
      
      // Move to next step without showing duplicate toast
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

  const handleSaveScript = async () => {
    if (!currentProject) return;
    
    const script = form.getValues("generatedScript");
    if (!script) {
      toast.error("No script to save");
      return;
    }

    try {
      await setGeneratedScript(currentProject.id, script);
      toast.success("Script saved successfully!");
      setEditing(false);
    } catch (error) {
      console.error("Error saving script:", error);
      toast.error("Failed to save script");
    }
  };

  const handleEditScript = () => {
    setEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset to the original script
    if (currentProject?.generatedScript) {
      form.setValue("generatedScript", currentProject.generatedScript);
    }
    setEditing(false);
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Car Details Form */}
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
                      className="min-h-[400px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The more details you provide, the better the script will be.
                    The script will be automatically matched to your shot sequence.
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Script...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate Script
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* Generated Script Display/Edit */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="font-medium">Generated Script</div>
            {currentProject.generatedScript && !editing && (
              <Button variant="outline" size="sm" onClick={handleEditScript}>
                Edit Script
              </Button>
            )}
            {editing && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  <X className="h-4 w-4" />
                </Button>
                <Button variant="default" size="sm" onClick={handleSaveScript}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            )}
          </div>
          
          {editing ? (
            <Form {...form}>
              <FormField
                control={form.control}
                name="generatedScript"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        className="min-h-[400px] resize-none"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </Form>
          ) : currentProject.generatedScript ? (
            <div className="bg-muted p-6 rounded-lg min-h-[400px] whitespace-pre-wrap overflow-y-auto text-sm">
              {currentProject.generatedScript}
            </div>
          ) : (
            <div className="bg-muted p-6 rounded-lg min-h-[400px] flex items-center justify-center text-muted-foreground text-sm">
              Enter car details and click generate to create a script
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 