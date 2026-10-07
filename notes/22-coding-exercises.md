# 22 · Coding exercises with solutions

No koans here. The small coding problems asked in live rounds, with solutions in TypeScript. To use one as plain JavaScript, delete the type annotations. To be marked on your own answer, use the JavaScript track of the playground on the website.

## How to approach a live coding question

Interviewers score *how* you work as much as the final answer. Follow the same steps every time:

1. **Clarify the input.** Case-sensitive? Spaces and punctuation? Can it be empty? Negative numbers? Duplicates?
2. **Say one example and one edge case out loud** before you write any code.
3. **Write the simple solution first**, then improve it if asked. A working O(n²) solution is better than a broken clever one.
4. **Be ready to solve it without built-ins.** Many interviewers say "no `sort()`, no `reverse()`, no `Math.max`". Each problem below shows a manual loop and, where it helps, a built-in one-liner.
5. **State the complexity** (time and space) at the end.
6. **Test it by walking through your example** line by line, as you would review a test script.

## Patterns behind almost every question

If you recognise which pattern a question uses, you can solve questions you've never seen:

| Pattern | What it looks like | Used in |
| --- | --- | --- |
| **Frequency map** (`Map`/object counter) | "count", "most frequent", "first unique", "anagram" | word count, char count, first non-repeating, most frequent, anagram |
| **Two pointers** | "in place", "sorted arrays", "reverse", "palindrome", "partition" | merging sorted arrays, evens before odds, palindrome, reverse in place |
| **Running max / min** | "largest", "second largest", "without sort", "maximum subarray" | second largest, min/max, Kadane |
| **Set or Map for lookups** | "unique", "duplicates", "intersection", "seen before" | remove duplicates, duplicate emails, two sum, intersection |
| **Carry / digit maths** | `% 10`, `Math.floor(x / 10)` | add one to a digit array, reverse number, sum of digits |
| **Stack** | "brackets", "undo", "nested" | balanced brackets |
| **Sliding window** | "longest substring", "subarray" | longest unique substring |
| **Reduce into an accumulator** | "group", "sum", "count by" | groupBy, status codes, prices |

## JavaScript mistakes interviewers look for

- `arr.sort()` without a comparator sorts numbers as strings.
- Using `==` instead of `===`.
- Changing the input array when you weren't asked to (copy it with `[...arr]` first).
- Starting `max` at `0`, which fails when every number is negative. Start from `arr[0]` or `-Infinity`.
- `split(' ')` on text with double spaces creates empty strings. Use `split(/\s+/)`.
- `0.1 + 0.2 !== 0.3`. For money, round or work in cents.
- `-3 % 2` is `-1`, so test for odd numbers with `% 2 !== 0`.
- Not handling empty input, a single element, all duplicates, or negative numbers.

## Number exercises

```ts
// FizzBuzz
const fizzBuzz = (n: number) => Array.from({ length: n }, (_, i) => {
  const k = i + 1;
  return k % 15 === 0 ? 'FizzBuzz' : k % 3 === 0 ? 'Fizz' : k % 5 === 0 ? 'Buzz' : String(k);
});

// Prime check: only test divisors up to √n
function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

// Factorial (recursive); be ready to write the loop version too
const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

// First n Fibonacci numbers
function fibonacci(n: number): number[] {
  const seq: number[] = [];
  for (let i = 0; i < n; i++) seq.push(i < 2 ? i : seq[i - 1] + seq[i - 2]);
  return seq;                              // fibonacci(8) → [0,1,1,2,3,5,8,13]
}

// Reverse a number without converting it to a string
function reverseNumber(n: number): number {
  let rev = 0, x = Math.abs(n);
  while (x > 0) { rev = rev * 10 + (x % 10); x = Math.floor(x / 10); }
  return n < 0 ? -rev : rev;               // reverseNumber(-120) → -21
}
// Palindrome number: n === reverseNumber(n)

// Sum of digits
function sumOfDigits(n: number): number {
  let sum = 0, x = Math.abs(n);
  while (x > 0) { sum += x % 10; x = Math.floor(x / 10); }
  return sum;                              // sumOfDigits(2403) → 9
}

// Armstrong number: 153 = 1³ + 5³ + 3³
function isArmstrong(n: number): boolean {
  const digits = String(n).split('').map(Number);
  return digits.reduce((s, d) => s + d ** digits.length, 0) === n;
}

// Swap two variables without a temporary variable
let a = 1, b = 2;
[a, b] = [b, a];
```

## Interviewers ask

### Warm-up

**Find the second largest number in the string `"claude2403edulac"`**
First clarify what "number" means. There are two readings:

- **(a) Each digit is a number.** The digits are 2, 4, 0, 3, so the largest is 4 and the second largest is **3**. This is the usual meaning.
- **(b) Each run of digits is a number.** `"abc12def45gh7"` contains 12, 45 and 7, so the second largest is 12. `"claude2403edulac"` has only one number (2403), so there is no second largest.

Reading (a), in a single pass without sorting:

```ts
function secondLargestDigit(s: string): number | null {
  let first = -1, second = -1;
  for (const ch of s) {
    if (ch < '0' || ch > '9') continue;        // skip letters
    const d = Number(ch);
    if (d > first) { second = first; first = d; }
    else if (d < first && d > second) second = d; // `d < first` skips a repeat of the largest
  }
  return second === -1 ? null : second;
}
secondLargestDigit('claude2403edulac'); // 3
secondLargestDigit('abc9def9');         // null - only one distinct digit
```

Reading (b), using regex and sort:

```ts
function secondLargestNumberInString(s: string): number | null {
  const nums = [...new Set((s.match(/\d+/g) ?? []).map(Number))].sort((a, b) => b - a);
  return nums.length >= 2 ? nums[1] : null;
}
secondLargestNumberInString('abc12def45gh7'); // 12
```

Complexity: (a) is O(n) time and O(1) space. (b) is O(n + k log k), where k is how many numbers are found.
Follow-ups: "What if there are no digits?" (return `null` rather than crashing) and "What about duplicate values?" (the `d < first` check handles them).

Source: checked by running the code, not documentation.

**Count how many times each word appears in a sentence and print each word with its count**
```ts
function wordOccurrences(sentence: string): Map<string, number> {
  const counts = new Map<string, number>();
  const words = sentence.toLowerCase().match(/[a-z0-9']+/g) ?? []; // drops punctuation
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return counts;
}

function printWordOccurrences(sentence: string): void {
  for (const [word, count] of wordOccurrences(sentence)) console.log(`${word}: ${count}`);
}

printWordOccurrences('The test passed, and the next test failed. The end!');
// the: 3
// test: 2
// passed: 1
// and: 1
// next: 1
// failed: 1
// end: 1
```

Points to mention:

- `toLowerCase()` makes "The" and "the" count as the same word. Ask the interviewer whether they want that.
- The regex removes punctuation, so `passed,` becomes `passed`. A plain `split(' ')` would count `test` and `test.` as different words.
- A `Map` keeps words in the order they first appear. A plain object also works:

```ts
const counts: Record<string, number> = Object.create(null); // with {} the word "constructor" finds an inherited property
for (const w of words) counts[w] = (counts[w] ?? 0) + 1;
```

- If the text can contain German words, use `/[\p{L}\d']+/gu` so umlauts count as letters.

Complexity: O(n) time and O(k) space, where k is the number of unique words.

Source: checked by running the code, not documentation.

**Merge two arrays**
Ask first: are duplicates allowed, and are the inputs sorted? The answer decides which version you write.

```ts
// Simple concatenation
const merged = [...a, ...b];            // or a.concat(b)

// Merged without duplicates
const mergedUnique = [...new Set([...a, ...b])];

// Without built-ins (the manual version interviewers often ask for)
function mergeArrays(a: number[], b: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < a.length; i++) out.push(a[i]);
  for (let i = 0; i < b.length; i++) out.push(b[i]);
  return out;
}

// Two SORTED arrays into one sorted array, using two pointers
function mergeSorted(a: number[], b: number[]): number[] {
  const out: number[] = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) out.push(a[i] <= b[j] ? a[i++] : b[j++]);
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}
mergeSorted([1, 4, 7], [2, 3, 8, 9]); // [1, 2, 3, 4, 7, 8, 9]
```

Complexity: all versions are O(n + m). Calling `[...a, ...b].sort()` instead would be O((n+m) log(n+m)), and plain `sort()` without a comparator orders numbers as strings: `[10, 9].sort()` gives `[10, 9]`. Interviewers often check whether you know this.

Source: checked by running the code, not documentation.

**Rearrange an array so that all even numbers come first, followed by the odd numbers**
```ts
// Keeps the original order within each group (stable). Uses a new array.
const evensFirst = (arr: number[]) =>
  [...arr.filter(n => n % 2 === 0), ...arr.filter(n => n % 2 !== 0)];
evensFirst([1, 2, 3, 4, 5, 6]); // [2, 4, 6, 1, 3, 5]

// In place with two pointers: O(1) extra space, but order within the groups can change.
function evensFirstInPlace(arr: number[]): number[] {
  let l = 0, r = arr.length - 1;
  while (l < r) {
    if (arr[l] % 2 === 0) l++;               // already in the right place
    else if (arr[r] % 2 !== 0) r--;          // already in the right place
    else { [arr[l], arr[r]] = [arr[r], arr[l]]; l++; r--; } // swap the odd and even pair
  }
  return arr;
}
evensFirstInPlace([1, 2, 3, 4, 5, 6]); // [6, 2, 4, 3, 5, 1]
```

Say which version you are writing and why: "The filter version is stable and easy to read. The two-pointer version uses no extra memory." Use `n % 2 !== 0` to test for odd numbers, not `n % 2 === 1`, because in JavaScript `-3 % 2` is `-1`.

Source: checked by running the code, not documentation.

**Add one to a number stored as an array of digits: `[1,2,9]` → `[1,3,0]`**
(This is the classic "plus one" problem. The expected result is `[1, 3, 0]`, because 129 + 1 = 130.)

```ts
function plusOne(digits: number[]): number[] {
  const out = [...digits];                 // don't change the input
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i] < 9) { out[i]++; return out; } // no carry, so we're done
    out[i] = 0;                               // 9 becomes 0; carry to the next digit
  }
  return [1, ...out];                         // every digit was 9, e.g. [9,9] becomes [1,0,0]
}
plusOne([1, 2, 9]); // [1, 3, 0]
plusOne([9, 9, 9]); // [1, 0, 0, 0]
plusOne([1, 2, 3]); // [1, 2, 4]
```

Why not use `Number(digits.join('')) + 1`? It fails for long arrays because numbers above `Number.MAX_SAFE_INTEGER` (about 9 × 10¹⁵) lose precision. Mention this in the interview; it shows you think about edge cases. (`BigInt` avoids the problem, but the digit loop is the answer interviewers expect.)
Complexity: O(n) time. A variation to be ready for: "add any number k", which uses the same carry logic.

Source: checked by running the code, not documentation.

### Strings

**Reverse a string**
(without using `reverse()`)

```ts
function reverseString(s: string): string {
  let out = '';
  for (let i = s.length - 1; i >= 0; i--) out += s[i];
  return out;
}
// Built-in version: [...s].reverse().join('')
```

Source: checked by running the code, not documentation.

**Palindrome check**
(ignoring case and punctuation, two pointers)

```ts
function isPalindrome(s: string): boolean {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  let l = 0, r = clean.length - 1;
  while (l < r) { if (clean[l] !== clean[r]) return false; l++; r--; }
  return true;
}
isPalindrome('A man, a plan, a canal: Panama'); // true
```

Source: checked by running the code, not documentation.

**Reverse the word order / reverse each word**
```ts
const reverseWordOrder = (s: string) => s.trim().split(/\s+/).reverse().join(' ');
// 'I love testing' → 'testing love I'
const reverseEachWord = (s: string) => s.split(' ').map(w => [...w].reverse().join('')).join(' ');
// 'I love testing' → 'I evol gnitset'
```

Source: checked by running the code, not documentation.

**Count occurrences of each character**
```ts
function charCount(s: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ch of s) counts[ch] = (counts[ch] ?? 0) + 1;
  return counts;
}
charCount('hello'); // { h: 1, e: 1, l: 2, o: 1 }
```

Source: checked by running the code, not documentation.

**First non-repeating character**
(count first, then find)

```ts
function firstNonRepeatingChar(s: string): string | null {
  const counts = charCount(s);
  for (const ch of s) if (counts[ch] === 1) return ch;
  return null;
}
firstNonRepeatingChar('swiss'); // 'w'
```

Source: checked by running the code, not documentation.

**Most frequent character**
```ts
function mostFrequentChar(s: string): string | null {
  let best: string | null = null, max = 0;
  for (const [ch, n] of Object.entries(charCount(s))) if (n > max) { max = n; best = ch; }
  return best;
}
mostFrequentChar('mississippi'); // 'i'  (i and s both appear 4 times; the first one found wins)
```

Source: checked by running the code, not documentation.

**Count vowels and consonants**
```ts
function countVowelsConsonants(s: string) {
  let vowels = 0, consonants = 0;
  for (const ch of s.toLowerCase()) {
    if ('aeiou'.includes(ch)) vowels++;
    else if (ch >= 'a' && ch <= 'z') consonants++;   // ignores digits, spaces and symbols
  }
  return { vowels, consonants };
}
countVowelsConsonants('Playwright!'); // { vowels: 2, consonants: 8 }
```

Source: checked by running the code, not documentation.

**Anagram check**
(O(n) with counts, instead of sorting both strings)

```ts
function isAnagram(a: string, b: string): boolean {
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z]/g, '');
  const x = norm(a), y = norm(b);
  if (x.length !== y.length) return false;
  const counts: Record<string, number> = {};
  for (const ch of x) counts[ch] = (counts[ch] ?? 0) + 1;
  for (const ch of y) { if (!counts[ch]) return false; counts[ch]--; }
  return true;
}
isAnagram('Listen', 'Silent'); // true
```

Source: checked by running the code, not documentation.

**Sum of the digits in a string**
```ts
const sumOfDigitsInString = (s: string) =>
  [...s].reduce((sum, ch) => (ch >= '0' && ch <= '9' ? sum + Number(ch) : sum), 0);
sumOfDigitsInString('claude2403edulac'); // 9
```

Source: checked by running the code, not documentation.

**Remove duplicate characters**
```ts
const removeDuplicateChars = (s: string) => [...new Set(s)].join('');
removeDuplicateChars('programming'); // 'progamin'
```

Source: checked by running the code, not documentation.

**Capitalise the first letter of each word**
```ts
const capitalizeWords = (s: string) =>
  s.split(' ').map(w => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)).join(' ');
capitalizeWords('hello wORLD from qa'); // 'Hello World From Qa'
```

Source: checked by running the code, not documentation.

**Longest word in a sentence**
```ts
const longestWord = (s: string) =>
  s.split(/\s+/).reduce((best, w) => (w.length > best.length ? w : best), '');
longestWord('I automate with playwright daily'); // 'playwright'
```

Source: checked by running the code, not documentation.

**Swap case**
```ts
const swapCase = (s: string) =>
  [...s].map(ch => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())).join('');
swapCase('HeLLo'); // 'hEllO'
```

Source: checked by running the code, not documentation.

**String compression**
,  `"aaabbc"` → `"a3b2c1"`

```ts
function compress(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; ) {
    let j = i;
    while (j < s.length && s[j] === s[i]) j++;  // move j to the end of the run
    out += s[i] + (j - i);
    i = j;
  }
  return out;
}
```

Source: checked by running the code, not documentation.

**Balanced brackets**
(uses a stack; a common question at intermediate level)

```ts
function isBalanced(s: string): boolean {
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const stack: string[] = [];
  for (const ch of s) {
    if ('([{'.includes(ch)) stack.push(ch);
    else if (ch in pairs && stack.pop() !== pairs[ch]) return false;
  }
  return stack.length === 0;
}
isBalanced('{[()]}'); // true
isBalanced('{[(])}'); // false
```

Source: checked by running the code, not documentation.

**Longest substring without repeating characters**
(sliding window)

```ts
function longestUniqueSubstring(s: string): number {
  const lastSeen = new Map<string, number>();
  let start = 0, best = 0;
  for (let i = 0; i < s.length; i++) {
    const prev = lastSeen.get(s[i]);
    if (prev !== undefined && prev >= start) start = prev + 1;  // move the window past the repeat
    lastSeen.set(s[i], i);
    best = Math.max(best, i - start + 1);
  }
  return best;
}
longestUniqueSubstring('abcabcbb'); // 3 ('abc')
```

Source: checked by running the code, not documentation.

### Arrays

**Minimum and maximum without `Math.max`**
```ts
function minMax(arr: number[]) {
  if (arr.length === 0) throw new Error('empty array');
  let min = arr[0], max = arr[0];              // start from arr[0], not 0, so negative numbers work
  for (const n of arr) { if (n < min) min = n; if (n > max) max = n; }
  return { min, max };
}
```

Source: checked by running the code, not documentation.

**Second largest in an array**
(single pass; handles duplicates)

```ts
function secondLargest(arr: number[]): number | null {
  let first = -Infinity, second = -Infinity;
  for (const n of arr) {
    if (n > first) { second = first; first = n; }
    else if (n < first && n > second) second = n;
  }
  return second === -Infinity ? null : second;
}
secondLargest([10, 5, 10, 8]); // 8   (the common wrong answer is 10)
```

Source: checked by running the code, not documentation.

**Remove duplicates / find duplicates**
```ts
const unique = [...new Set(arr)];              // one-liner

function removeDuplicates<T>(arr: T[]): T[] {   // manual version, keeps order
  const seen = new Set<T>(), out: T[] = [];
  for (const x of arr) if (!seen.has(x)) { seen.add(x); out.push(x); }
  return out;
}

function findDuplicates<T>(arr: T[]): T[] {
  const seen = new Set<T>(), dups = new Set<T>();
  for (const x of arr) (seen.has(x) ? dups : seen).add(x);
  return [...dups];
}
findDuplicates([1, 2, 2, 3, 1, 1]); // [2, 1]
```

Source: checked by running the code, not documentation.

**Missing number in 1..n**
(using the sum formula)

```ts
const missingNumber = (arr: number[], n: number) =>
  (n * (n + 1)) / 2 - arr.reduce((s, x) => s + x, 0);
missingNumber([1, 2, 4, 5], 5); // 3
```

Source: checked by running the code, not documentation.

**Two sum**
,  find the indices of two numbers that add up to a target (hash map, O(n))

```ts
function twoSum(nums: number[], target: number): [number, number] | null {
  const seen = new Map<number, number>();           // value → index
  for (let i = 0; i < nums.length; i++) {
    const j = seen.get(target - nums[i]);
    if (j !== undefined) return [j, i];
    seen.set(nums[i], i);
  }
  return null;
}
twoSum([2, 7, 11, 15], 9); // [0, 1]
```

Source: checked by running the code, not documentation.

**All unique pairs with a given sum**
```ts
function pairsWithSum(arr: number[], target: number): [number, number][] {
  const seen = new Set<number>(), used = new Set<string>(), out: [number, number][] = [];
  for (const n of arr) {
    const m = target - n;
    const key = `${Math.min(n, m)},${Math.max(n, m)}`;
    if (seen.has(m) && !used.has(key)) { out.push([Math.min(n, m), Math.max(n, m)]); used.add(key); }
    seen.add(n);
  }
  return out;
}
pairsWithSum([1, 5, 7, -1, 5], 6); // [[1, 5], [-1, 7]]
```

Source: checked by running the code, not documentation.

**Rotate an array right by k positions**
```ts
function rotateRight<T>(arr: T[], k: number): T[] {
  const n = arr.length;
  if (n === 0) return [];
  const s = k % n;                      // k can be larger than the array length
  return [...arr.slice(n - s), ...arr.slice(0, n - s)];
}
rotateRight([1, 2, 3, 4, 5], 2); // [4, 5, 1, 2, 3]
```

Source: checked by running the code, not documentation.

**Move zeros to the end**
(in place, keeping the order of the other numbers)

```ts
function moveZerosToEnd(arr: number[]): number[] {
  let write = 0;
  for (const n of arr) if (n !== 0) arr[write++] = n;
  while (write < arr.length) arr[write++] = 0;
  return arr;
}
moveZerosToEnd([0, 1, 0, 3, 12]); // [1, 3, 12, 0, 0]
```

Source: checked by running the code, not documentation.

**Intersection, union and difference**
```ts
const intersection = <T>(a: T[], b: T[]) => { const sb = new Set(b); return [...new Set(a.filter(x => sb.has(x)))]; };
const union        = <T>(a: T[], b: T[]) => [...new Set([...a, ...b])];
const difference   = <T>(a: T[], b: T[]) => { const sb = new Set(b); return a.filter(x => !sb.has(x)); };
```

Why use a `Set` for lookups? `b.includes(x)` inside a filter is O(n·m); a `Set` lookup makes it O(n + m).

Source: checked by running the code, not documentation.

**Flatten a nested array**
(recursion; the built-in is `arr.flat(Infinity)`)

```ts
function flatten(arr: unknown[]): unknown[] {
  const out: unknown[] = [];
  for (const x of arr) Array.isArray(x) ? out.push(...flatten(x)) : out.push(x);
  return out;
}
flatten([1, [2, [3, [4]]], 5]); // [1, 2, 3, 4, 5]
```

Source: checked by running the code, not documentation.

**Split an array into chunks**
(useful for batching API calls in tests)

```ts
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
```

Source: checked by running the code, not documentation.

**Most frequent element**
```ts
function mostFrequent<T>(arr: T[]): T | null {
  const counts = new Map<T, number>();
  let best: T | null = null, max = 0;
  for (const x of arr) {
    const c = (counts.get(x) ?? 0) + 1;
    counts.set(x, c);
    if (c > max) { max = c; best = x; }
  }
  return best;
}
```

Source: checked by running the code, not documentation.

**Reverse an array in place**
(swap from both ends)

```ts
function reverseInPlace<T>(arr: T[]): T[] {
  for (let l = 0, r = arr.length - 1; l < r; l++, r--) [arr[l], arr[r]] = [arr[r], arr[l]];
  return arr;
}
```

Source: checked by running the code, not documentation.

**Sort without `sort()`**
(bubble sort, stopping early once the array is sorted)

```ts
function bubbleSort(input: number[]): number[] {
  const arr = [...input];
  for (let i = 0; i < arr.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < arr.length - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) { [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]; swapped = true; }
    }
    if (!swapped) break;             // no swaps means the array is already sorted
  }
  return arr;
}
```

Know the key facts: bubble sort is O(n²). The built-in `Array.prototype.sort` is O(n log n) and stable. Without a comparator it sorts numbers as strings, so use `arr.sort((a, b) => a - b)`.

Source: checked by running the code, not documentation.

**Maximum subarray sum**
(Kadane's algorithm)

```ts
function maxSubarraySum(arr: number[]): number {
  let best = arr[0], current = arr[0];
  for (let i = 1; i < arr.length; i++) {
    current = Math.max(arr[i], current + arr[i]);   // either extend the current run or start a new one here
    best = Math.max(best, current);
  }
  return best;
}
maxSubarraySum([-2, 1, -3, 4, -1, 2, 1, -5, 4]); // 6  ([4, -1, 2, 1])
```

Source: checked by running the code, not documentation.

### Test-automation style

These are closer to real work: handling API responses, logs and page text.

**Find users with duplicate emails in an API response**
(normalise before comparing)

```ts
type User = { id: number; email: string; name: string; age: number };

function duplicateEmails(users: User[]): string[] {
  const seen = new Set<string>(), dups = new Set<string>();
  for (const { email } of users) {
    const e = email.trim().toLowerCase();      // 'B@x.io' and 'b@x.io ' are the same address
    (seen.has(e) ? dups : seen).add(e);
  }
  return [...dups];
}
```

Source: checked by running the code, not documentation.

**Group objects by a key**
```ts
function groupBy<T, K extends PropertyKey>(items: T[], key: (item: T) => K): Record<K, T[]> {
  return items.reduce((acc, item) => {
    (acc[key(item)] ??= []).push(item);
    return acc;
  }, Object.create(null) as Record<K, T[]>);   // no inherited keys, so a key like 'constructor' is safe
}
groupBy(users, u => u.name);
// Node 21+ has a built-in version: Object.groupBy(users, u => u.name)
```

Source: [Object.groupBy() - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy), and checked by running the code.

**Sort by two fields**
(name ascending, then age descending)

```ts
const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name) || b.age - a.age);
```

Use `localeCompare` for strings. It also sorts German umlauts correctly with `localeCompare(b, 'de')`.

Source: checked by running the code, not documentation.

**Count status codes by family from a log array**
```ts
function countStatusCodes(logs: { status: number }[]): Record<string, number> {
  return logs.reduce((acc, { status }) => {
    const family = `${Math.floor(status / 100)}xx`;
    acc[family] = (acc[family] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
countStatusCodes([{ status: 200 }, { status: 201 }, { status: 404 }, { status: 500 }]);
// { '2xx': 2, '4xx': 1, '5xx': 1 }
```

Source: checked by running the code, not documentation.

**Extract prices from page text and total them**
(handles the German decimal comma)

```ts
function sumPrices(text: string): number {
  const prices = text.match(/\d+(?:[.,]\d{1,2})?/g) ?? [];
  const total = prices.map(p => Number(p.replace(',', '.'))).reduce((s, p) => s + p, 0);
  return Math.round(total * 100) / 100;          // rounding avoids 0.1 + 0.2 = 0.30000000000000004
}
sumPrices('Item A €12.50, item B €7,25, shipping 3'); // 22.75
```

A typical follow-up: "How would you check the cart total in Playwright?" Read the line items with `locator.allTextContents()`, sum them with this function, and assert with `await expect(totalLocator).toHaveText(...)`. Mention the floating-point pitfall: compare amounts in cents or round them.

Source: checked by running the code, not documentation.

**Deep equality of two objects**
(recursive)

```ts
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(k => kb.includes(k) && deepEqual((a as any)[k], (b as any)[k])); // same keys, not only the same number of keys
}
```

Limitations to mention: it doesn't handle Dates, Maps, Sets or circular references. In real tests, use `expect(a).toEqual(b)`.

Source: checked by running the code, not documentation.

**Parse a URL's query string into an object**
```ts
const parseQuery = (url: string) => Object.fromEntries(new URL(url).searchParams);
parseQuery('https://shop.io/search?q=shoes&page=2'); // { q: 'shoes', page: '2' }
```

Source: checked by running the code, not documentation.

**Swap an object's keys and values**
```ts
const invertObject = (obj: Record<string, string>) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));
```

Source: checked by running the code, not documentation.
