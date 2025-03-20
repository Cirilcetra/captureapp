"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

// Form validation schema
const formSchema = z.object({
  carId: z.string().min(3, "Car ID must be at least 3 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export default function EmptyState() {
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
  
  return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold mb-2">Welcome to Car Capture App</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Create your first project to start making professional car promotional videos with AI assistance.
      </p>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="lg">Create Your First Project</Button>
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
  );
} 