import { FileQuestion, AlertCircle } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon: Icon = FileQuestion, action }: EmptyStateProps) {
  return (
    <div className="apple-card flex flex-col items-center justify-center min-h-[300px] w-full p-8 border-dashed">
       <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
         <Icon className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
       </div>
       <h3 className="text-xl font-semibold bg-gradient-to-br from-zinc-900 to-zinc-600 dark:from-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent">{title}</h3>
       <p className="mt-2 text-sm text-center text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
         {description}
       </p>
       {action && (
         <div className="mt-6">
           {action}
         </div>
       )}
    </div>
  );
}
