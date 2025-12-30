import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TextModeId } from "@/lib/constants";
import { CreativeTone } from "@/components/carousel-creator/TextModeSelector";

export type ProcessingStatus = 
  | "QUEUED" 
  | "TRANSCRIBING" 
  | "SCRIPTING" 
  | "GENERATING" 
  | "COMPLETED" 
  | "FAILED";

interface Slide {
  number: number;
  type: string;
  text: string;
  imageUrl?: string;
}

interface GenerationResult {
  transcription: string;
  script: {
    textMode: string;
    creativeTone: string;
    slides: Slide[];
    total_slides: number;
  };
  slides: Slide[];
}

export interface ProfileIdentity {
  name: string;
  username: string;
  photoUrl: string | null;
  avatarPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  displayMode: 'name_and_username' | 'username_only';
}

export interface CarouselGenerationOptions {
  audioFile: File;
  textMode: TextModeId;
  creativeTone: CreativeTone;
  slideCountMode: 'auto' | 'manual';
  slideCount: number;
  template: string;
  style: string;
  format: string;
  carouselId: string;
  userId: string;
  isPro?: boolean;
  language?: string;
  profile?: ProfileIdentity;
}

export function useCarouselGeneration() {
  const [status, setStatus] = useState<ProcessingStatus>("QUEUED");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const generateCarousel = async (options: CarouselGenerationOptions): Promise<GenerationResult | null> => {
    const {
      audioFile,
      textMode,
      creativeTone,
      slideCountMode,
      slideCount,
      template,
      style,
      format,
      carouselId,
      userId,
      isPro = false,
      language = 'pt-BR',
      profile
    } = options;
    setError(null);
    
    try {
      // Step 1: Transcribe audio
      setStatus("TRANSCRIBING");
      await updateCarouselStatus(carouselId, "TRANSCRIBING");

      // Convert audio file to base64
      const audioBase64 = await fileToBase64(audioFile);

      const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke(
        "transcribe-audio",
        {
          body: { audio: audioBase64, mimeType: audioFile.type }
        }
      );

      if (transcribeError || transcribeData?.error) {
        throw new Error(transcribeData?.error || transcribeError?.message || "Transcription failed");
      }

      const transcription = transcribeData.transcription;
      console.log("Transcription completed:", transcription.substring(0, 100));

      // Step 2: Generate script with AI
      setStatus("SCRIPTING");
      await updateCarouselStatus(carouselId, "SCRIPTING");

      const { data: scriptData, error: scriptError } = await supabase.functions.invoke(
        "generate-script",
        {
          body: { 
            transcription, 
            textMode,
            creativeTone,
            slideCount,
            slideCountMode,
            template,
            language 
          }
        }
      );

      if (scriptError || scriptData?.error) {
        throw new Error(scriptData?.error || scriptError?.message || "Script generation failed");
      }

      const script = scriptData.script;
      console.log("Script generated with", script.slides?.length, "slides");

      // Step 3: Generate images (with watermark for free users)
      setStatus("GENERATING");
      await updateCarouselStatus(carouselId, "GENERATING");

      const hasWatermark = !isPro;
      
      const { data: imagesData, error: imagesError } = await supabase.functions.invoke(
        "generate-carousel-images",
        {
          body: { 
            script, 
            style, 
            format, 
            carouselId, 
            userId,
            hasWatermark,
            profile
          }
        }
      );

      if (imagesError || imagesData?.error) {
        throw new Error(imagesData?.error || imagesError?.message || "Image generation failed");
      }

      const slides = imagesData.slides;
      console.log("Generated", slides.length, "slide images");

      // Step 4: Update carousel in database
      setStatus("COMPLETED");
      await supabase.from("carousels").update({
        status: "COMPLETED",
        transcription,
        script,
        slide_count: slides.length,
        image_urls: imagesData.imageUrls,
        has_watermark: hasWatermark,
      }).eq("id", carouselId);

      const generationResult: GenerationResult = {
        transcription,
        script,
        slides
      };

      setResult(generationResult);
      return generationResult;

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      console.error("Generation error:", err);
      setError(errorMessage);
      setStatus("FAILED");
      
      await supabase.from("carousels").update({
        status: "FAILED",
        error_message: errorMessage
      }).eq("id", carouselId);

      return null;
    }
  };

  const updateCarouselStatus = async (carouselId: string, status: ProcessingStatus) => {
    await supabase.from("carousels").update({ status }).eq("id", carouselId);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just the base64 string
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return {
    status,
    error,
    result,
    generateCarousel,
  };
}
