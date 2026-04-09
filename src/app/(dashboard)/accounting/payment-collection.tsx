"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect, FormTextarea } from "@/components/ui/form-fields";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, DollarSign, Banknote, Smartphone, CheckCircle } from "lucide-react";
import { createPayment } from "./actions";

const paymentSchema = z.object({
  studentId: z.string().min(1, "Please select a student"),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Amount must be a positive number"
  ),
  paymentMethod: z.string().min(1, "Please select a payment method"),
  description: z.string().min(1, "Description is required"),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const paymentMethods = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Credit/Debit Card", icon: CreditCard },
  { value: "bank_transfer", label: "Bank Transfer", icon: DollarSign },
  { value: "digital_wallet", label: "Digital Wallet", icon: Smartphone },
  { value: "check", label: "Check", icon: CheckCircle },
];

interface PaymentCollectionProps {
  students: Array<{ id: string; full_name: string }>;
}

export function PaymentCollection({ students }: PaymentCollectionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  });

  const onSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const result = await createPayment({
        studentId: data.studentId,
        amount: parseFloat(data.amount),
        paymentMethod: data.paymentMethod,
        description: data.description,
      });

      if (result.success) {
        setSubmitMessage({ type: 'success', message: 'Payment recorded successfully!' });
        reset();
      } else {
        setSubmitMessage({ type: 'error', message: result.error || 'Failed to record payment' });
      }
    } catch (error) {
      setSubmitMessage({ type: 'error', message: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CreditCard className="w-5 h-5 text-green-600" />
          Collect Student Payment
        </CardTitle>
        <CardDescription>
          Record payments received from students through various payment methods
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Student Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Select Student
            </label>
            <select
              {...register("studentId")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-zinc-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">Choose a student...</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </select>
            {errors.studentId && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.studentId.message}</p>
            )}
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Payment Amount ($)
            </label>
            <Input
              {...register("amount")}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="w-full"
            />
            {errors.amount && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.amount.message}</p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Payment Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <label
                    key={method.value}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                  >
                    <input
                      type="radio"
                      value={method.value}
                      {...register("paymentMethod")}
                      className="w-4 h-4 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-500"
                    />
                    <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {method.label}
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.paymentMethod && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.paymentMethod.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Description
            </label>
            <FormTextarea
              {...register("description")}
              placeholder="Payment for tuition, fees, etc."
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
          >
            {isSubmitting ? "Recording Payment..." : "Record Payment"}
          </Button>

          {/* Success/Error Message */}
          {submitMessage && (
            <div className={`p-4 rounded-xl border ${
              submitMessage.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/50 dark:border-green-800 dark:text-green-200'
                : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200'
            }`}>
              <p className="text-sm font-medium">{submitMessage.message}</p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}