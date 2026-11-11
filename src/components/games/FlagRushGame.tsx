"use client";

import type { GameProps } from "../GamePage";
import TimedQuiz from "./TimedQuiz";

export default function FlagRushGame(props: GameProps) {
  return <TimedQuiz {...props} variant="flagrush" />;
}
