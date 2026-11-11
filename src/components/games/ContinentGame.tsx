"use client";

import type { GameProps } from "../GamePage";
import TimedQuiz from "./TimedQuiz";

export default function ContinentGame(props: GameProps) {
  return <TimedQuiz {...props} variant="continent" />;
}
