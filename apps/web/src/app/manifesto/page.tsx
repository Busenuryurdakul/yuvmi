import type { Metadata } from "next";
import { ManifestoExperienceLab } from "@/components/manifesto/variants/ManifestoExperienceLab";
import "./lab.css";

export const metadata: Metadata = {
  title: "Yuvmi Manifestosu — Bugünkü seni keşfet. Gelecekteki seni inşa et.",
  description:
    "Yuvmi; kendini tanıdığın, hedeflerini somutlaştırdığın, gelişimini gördüğün ve sevdiklerinle birlikte büyüyebildiğin dijital yuvandır.",
};

export default function ManifestoPage() {
  return (
    <div className="lab-page">
      <ManifestoExperienceLab />
    </div>
  );
}
