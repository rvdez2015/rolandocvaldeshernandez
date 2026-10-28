/* Explicit, optional teacher-editing suggestion. Does not alter canonical questions. */
export const LESSON_23_ID='PX25-Y11-U02-L003';
export const LESSON_23_FIELDS={
 title:'2.3 — Units of Data Storage and Conversions',
 objectives:[
 'Define and order the units of data storage from bit to petabyte, including the size of a nibble and a byte.',
 'Convert quantities accurately between bits, bytes, KB, MB, GB, TB and PB using the stated conversion convention.',
 'Apply conversions to compare storage amounts and decide whether a device has sufficient capacity for supplied data sizes.'
 ].join('\n'),
 success:[
 'I can state that 1 nibble = 4 bits, 1 byte = 8 bits, and order KB, MB, GB, TB and PB correctly.',
 'I can show the multiplication or division for conversions, including 2.5 GB to MB and 3,200,000 bytes to MB.',
 'I can compare total storage capacities expressed in given units and show correct units at every step.'
 ].join('\n'),
 explanation:[
 'A bit (binary digit) can be 0 or 1. Digital computers use binary states to represent information. A nibble is 4 bits; a byte is 8 bits.',
 'For this lesson use decimal unit relationships unless a question explicitly specifies otherwise: 1 KB = 1,000 bytes; 1 MB = 1,000 KB; 1 GB = 1,000 MB; 1 TB = 1,000 GB; 1 PB = 1,000 TB.',
 'Multiply when converting to a smaller unit, divide when converting to a larger unit. Converting bytes into bits requires multiplying by 8.',
 'Worked examples: 2.5 GB × 1,000 = 2,500 MB. 3,200,000 bytes ÷ 1,000 ÷ 1,000 = 3.2 MB. 2 KB × 1,000 × 8 = 16,000 bits.',
 'Capacity comparison: Three 250 MB items plus 0.5 GB use 750 + 500 = 1,250 MB = 1.25 GB, which will not fit on a 1 GB device, ignoring formatting overhead.',
 'OCR accepts 1,024-based conversions where appropriate: follow the convention stated in the question, and do not mix 1,000 and 1,024 in one calculation.',
 'Character-count, image-size and sound-sampling formulas are covered in their designated later lessons, not in this lesson.'
 ].join('\n\n'),
 prior:'Students know that computers represent information with binary digits, storage devices have finite capacity, and multiplication/division change numerical magnitude.',
 misconceptions:[
 'A nibble is 4 bits, not 4 bytes.',
 'A byte is 8 bits; MB (megabytes) and Mb (megabits) are not the same.',
 'Converting to a larger storage unit makes the numerical value smaller, not larger.',
 'The decimal relationship between neighbouring KB, MB, GB, TB and PB units is a factor of 1,000.',
 'Usable storage capacity can be lower than advertised capacity due to system overhead.'
 ].join('\n')
};
export const LESSON_23_WARNING='The canonical Question 3 still includes text-file calculations. This editor cannot change the question bank or existing Google Docs worksheet. A separate versioned assessment correction is required before Lesson 2.3 is fully reconciled.';
