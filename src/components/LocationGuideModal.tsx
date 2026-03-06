import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Smartphone, Apple } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LocationGuideModalProps {
  open: boolean;
  onClose: () => void;
}

const LocationGuideModal = ({ open, onClose }: LocationGuideModalProps) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 gap-0 rounded-2xl overflow-hidden z-[300]">
        <DialogHeader className="p-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-lg">
            📍 Hướng dẫn bật vị trí
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Chọn thiết bị bạn đang dùng để xem hướng dẫn chi tiết</p>
        </DialogHeader>

        <Tabs defaultValue="desktop" className="flex flex-col">
          <TabsList className="mx-5 mt-3 grid grid-cols-3 h-11 rounded-xl">
            <TabsTrigger value="desktop" className="gap-1.5 rounded-lg text-xs">
              <Monitor className="w-4 h-4" /> Máy tính
            </TabsTrigger>
            <TabsTrigger value="android" className="gap-1.5 rounded-lg text-xs">
              <Smartphone className="w-4 h-4" /> Android
            </TabsTrigger>
            <TabsTrigger value="iphone" className="gap-1.5 rounded-lg text-xs">
              <Apple className="w-4 h-4" /> iPhone
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[50vh] px-5 pb-5">
            <TabsContent value="desktop" className="mt-4 space-y-5 text-sm">
              <GuideSection title="Cách 1 – Nhanh nhất" steps={[
                'Mở website cần bật vị trí.',
                'Nhìn bên trái thanh địa chỉ.',
                'Bấm vào 🔒 biểu tượng ổ khóa.',
                'Tìm mục Location / Vị trí.',
                'Chọn Allow / Cho phép.',
                'Tải lại trang (F5).',
              ]} />
              <GuideSection title="Cách 2 – Trong cài đặt trình duyệt" steps={[
                'Mở Cài đặt trình duyệt.',
                'Vào Quyền riêng tư và bảo mật.',
                'Chọn Cài đặt trang web (Site settings).',
                'Chọn Vị trí (Location).',
                'Tìm website trong danh sách Đã chặn.',
                'Đổi sang Cho phép.',
              ]} />
            </TabsContent>

            <TabsContent value="android" className="mt-4 space-y-5 text-sm">
              <GuideSection title="Cách 1 – Trong trình duyệt Chrome" steps={[
                'Mở Chrome.',
                'Bấm ⋮ (3 chấm) góc phải.',
                'Chọn Cài đặt.',
                'Chọn Cài đặt trang web.',
                'Chọn Vị trí.',
                'Vào Đã chặn.',
                'Chọn website → Cho phép.',
              ]} />
              <GuideSection title="Cách 2 – Bật GPS điện thoại" steps={[
                'Vào Cài đặt điện thoại.',
                'Chọn Vị trí.',
                'Bật GPS / Location.',
              ]} />
            </TabsContent>

            <TabsContent value="iphone" className="mt-4 space-y-5 text-sm">
              <GuideSection title="Bật lại vị trí cho Safari" steps={[
                'Mở Cài đặt iPhone.',
                'Chọn Quyền riêng tư & Bảo mật.',
                'Chọn Dịch vụ định vị.',
                'Bật Location Services.',
                'Kéo xuống chọn Safari Websites.',
                'Chọn While Using App.',
              ]} />
              <GuideSection title="Bật lại vị trí cho Chrome" steps={[
                'Mở Cài đặt iPhone.',
                'Kéo xuống chọn Chrome.',
                'Chọn Vị trí.',
                'Chọn While Using App.',
              ]} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const GuideSection = ({ title, steps }: { title: string; steps: string[] }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <h4 className="font-semibold text-foreground mb-3">{title}</h4>
    <ol className="space-y-2">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-2.5 text-muted-foreground">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  </div>
);

export default LocationGuideModal;
