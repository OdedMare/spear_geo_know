"use client";

import type { GameProps } from "../GamePage";
import { QuizRounds } from "./FlagsGame";

export default function CapitalsGame(props: GameProps) {
  return <QuizRounds {...props} variant="capitals" />;
}
