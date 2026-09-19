import { generate } from "@/lib/ai/router";
import { z } from "zod";

const ClarificationSchema=z.object({
  needsClarification:z.boolean(),
  questions:z.array(z.object({id:z.string().min(1).max(100),question:z.string().min(1).max(1000),reason:z.string().max(1000).optional(),required:z.boolean().default(true)})).max(8),
});
export type PlanClarification=z.infer<typeof ClarificationSchema>;

export async function analyzePlanClarifications(objective:string,context?:string):Promise<PlanClarification>{
  const response=await generate({task:"reasoning",messages:[
    {role:"system",content:"You are the Gen3ia Plan Mode clarification engine. Detect only information that is genuinely necessary to execute the user objective correctly. Do not ask questions when reasonable defaults are safe. Never ask for passwords, API keys, secrets or other credentials. Return JSON only."},
    {role:"user",content:"OBJECTIVE:\n"+objective+"\n\nCONTEXT:\n"+(context?.slice(0,20000)??"")+"\n\nReturn {needsClarification,questions:[{id,question,reason,required}]}. Ask concise questions about missing scope, target, output format, constraints, permissions or destructive actions."}
  ],maxTokens:2000});
  let parsed:unknown;
  try{parsed=JSON.parse(response.text);}catch{throw new Error("Clarification engine returned invalid JSON.");}
  const result=ClarificationSchema.safeParse(parsed);
  if(!result.success)throw new Error("Clarification engine returned an invalid response.");
  return result.data;
}