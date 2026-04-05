// Convert number to Vietnamese words
const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];

function readGroup(n: number): string {
  if (n === 0) return '';
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  let result = '';
  if (h > 0) result += ones[h] + ' trăm ';
  if (t > 1) {
    result += ones[t] + ' mươi ';
    if (u === 1) result += 'mốt';
    else if (u === 5) result += 'lăm';
    else if (u > 0) result += ones[u];
  } else if (t === 1) {
    result += teens[u];
  } else if (t === 0 && h > 0 && u > 0) {
    result += 'lẻ ' + ones[u];
  } else if (u > 0) {
    result += ones[u];
  }
  return result.trim();
}

export function numberToVietnameseWords(n: number): string {
  if (n === 0) return 'không đồng';
  if (n < 0) return 'âm ' + numberToVietnameseWords(-n);

  const units = ['', ' nghìn', ' triệu', ' tỷ'];
  const groups: number[] = [];
  let num = Math.floor(n);

  while (num > 0) {
    groups.push(num % 1000);
    num = Math.floor(num / 1000);
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] > 0) {
      parts.push(readGroup(groups[i]) + units[i]);
    }
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim() + ' đồng';
}
