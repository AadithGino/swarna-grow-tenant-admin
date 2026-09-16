"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Surface } from "@/src/components/common/page-parts";
import { useAppSelector } from "@/src/store/hooks";

export function SetupChecklist() {
  const session = useAppSelector((s) => s.session.session);
  const tasks = session?.setupTasks ?? [];
  if (!tasks.length || session?.setupComplete) return null;
  const done = tasks.filter((t) => t.completed).length;
  return (
    <Surface
      title="Complete your setup"
      description={`${done} of ${tasks.length} tasks done — finish these before day-to-day operations.`}
      className="border-[#eadbb5] bg-[#fffdf8]"
    >
      <ul className="divide-y">
        {tasks.map((task) => (
          <li
            key={task.key}
            className="flex items-center justify-between gap-4 px-5 py-4"
          >
            <div className="flex items-start gap-3">
              {task.completed ? (
                <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 size-5 text-muted-foreground" />
              )}
              <span className={task.completed ? "text-muted-foreground line-through" : "font-medium"}>
                {task.label}
              </span>
            </div>
            {!task.completed ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={task.href}>Open</Link>
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </Surface>
  );
}
