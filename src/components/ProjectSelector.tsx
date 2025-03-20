"use client";

import { useState } from "react";
import { CarProject, useAppStore } from "@/lib/store";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";

// Form validation schema
const formSchema = z.object({
  carId: z.string().min(3, "Car ID must be at least 3 characters"),
});

type FormValues = z.infer<typeof formSchema>;

interface ProjectSelectorProps {
  projects: CarProject[];
  onSelectProject: (id: string) => void;
}

export default function ProjectSelector({ projects, onSelectProject }: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const { createProject } = useAppStore();
  
  // Setup form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      carId: "",
    },
  });
  
  // Form submission handler
  const onSubmit = (values: FormValues) => {
    createProject(values.carId);
    setOpen(false);
    toast.success(`Project for "${values.carId}" created!`);
    form.reset();
  };
  
  // Helper to format dates
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString();
  };
  
  // Calculate project progress
  const getProjectProgress = (project: CarProject) => {
    const totalShots = project.shots.length;
    const completedShots = project.shots.filter(shot => shot.completed).length;
    return Math.floor((completedShots / totalShots) * 100);
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Your Projects</h2>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new car video project</DialogTitle>
              <DialogDescription>
                Enter the car ID to start creating a new promotional video.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="carId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Car ID</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Tesla-Model-3-2023" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit">Create Project</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            className="cursor-pointer"
            onClick={() => onSelectProject(project.id)}
          >
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>{project.carId}</CardTitle>
                <CardDescription>
                  Created on {formatDate(project.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span>Progress:</span>
                    <span>{getProjectProgress(project)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div 
                      className="bg-primary h-2.5 rounded-full" 
                      style={{ width: `${getProjectProgress(project)}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <div className="text-sm text-muted-foreground">
                  Updated: {formatDate(project.updatedAt)}
                </div>
              </CardFooter>
            </Card>
          </div>
        ))}
        
        {/* Add new project card */}
        <Card 
          className="h-full border-dashed flex items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setOpen(true)}
        >
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="rounded-full border-2 border-current p-2 mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </div>
            <p className="font-medium">Create New Project</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 