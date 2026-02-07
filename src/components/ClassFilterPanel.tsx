import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Filter, ChevronDown, ChevronUp, MapPin, Clock, Calendar, BookOpen, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const SUBJECTS = ['Toán', 'Vật Lý', 'Hóa Học', 'Sinh Học', 'Ngữ Văn', 'Tiếng Anh', 'Lịch Sử', 'Địa Lý', 'GDCD', 'Tin Học'];

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Thứ 2' },
  { key: 'tuesday', label: 'Thứ 3' },
  { key: 'wednesday', label: 'Thứ 4' },
  { key: 'thursday', label: 'Thứ 5' },
  { key: 'friday', label: 'Thứ 6' },
  { key: 'saturday', label: 'Thứ 7' },
  { key: 'sunday', label: 'CN' },
];

interface ClassFilterPanelProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  area: string;
  startTime: string;
  endTime: string;
  days: string[];
  subjects: string[];
}

const ClassFilterPanel = ({ onFilterChange }: ClassFilterPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    area: '',
    startTime: '',
    endTime: '',
    days: [],
    subjects: [],
  });

  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleDay = (dayKey: string) => {
    const newDays = filters.days.includes(dayKey)
      ? filters.days.filter(d => d !== dayKey)
      : [...filters.days, dayKey];
    updateFilter('days', newDays);
  };

  const toggleSubject = (subject: string) => {
    const newSubjects = filters.subjects.includes(subject)
      ? filters.subjects.filter(s => s !== subject)
      : [...filters.subjects, subject];
    updateFilter('subjects', newSubjects);
  };

  const clearFilters = () => {
    const emptyFilters: FilterState = {
      area: '',
      startTime: '',
      endTime: '',
      days: [],
      subjects: [],
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = filters.area || filters.startTime || filters.endTime || 
    filters.days.length > 0 || filters.subjects.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Bộ lọc nâng cao
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1">
                {(filters.area ? 1 : 0) + (filters.startTime ? 1 : 0) + filters.days.length + filters.subjects.length}
              </Badge>
            )}
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="w-4 h-4 mr-1" />
            Xóa bộ lọc
          </Button>
        )}
      </div>

      <CollapsibleContent className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/30">
          {/* Khu vực */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Khu vực
            </Label>
            <Input
              placeholder="Nhập quận/huyện, tỉnh/TP..."
              value={filters.area}
              onChange={(e) => updateFilter('area', e.target.value)}
            />
          </div>

          {/* Thời gian học */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Thời gian học
            </Label>
            <div className="flex gap-2">
              <Input
                type="time"
                placeholder="Từ"
                value={filters.startTime}
                onChange={(e) => updateFilter('startTime', e.target.value)}
                className="flex-1"
              />
              <Input
                type="time"
                placeholder="Đến"
                value={filters.endTime}
                onChange={(e) => updateFilter('endTime', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          {/* Thứ học */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Thứ học trong tuần
            </Label>
            <div className="flex flex-wrap gap-1">
              {DAYS_OF_WEEK.map(day => (
                <Button
                  key={day.key}
                  type="button"
                  variant={filters.days.includes(day.key) ? "default" : "outline"}
                  size="sm"
                  className="text-xs px-2 py-1 h-7"
                  onClick={() => toggleDay(day.key)}
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Môn học */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Môn học
            </Label>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {SUBJECTS.map(subject => (
                <label key={subject} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={filters.subjects.includes(subject)}
                    onCheckedChange={() => toggleSubject(subject)}
                  />
                  {subject}
                </label>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ClassFilterPanel;
