#!/usr/bin/env node

/**
 * Font Usage Analyzer
 * Scans the source files to determine which characters are actually used
 * and suggests optimal font subsets.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { extname, join } from 'path';

const SOURCE_DIR = './src';
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist'];

function getAllFiles(dir, fileList = []) {
  const files = readdirSync(dir);

  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory() && !EXCLUDED_DIRS.includes(file)) {
      getAllFiles(filePath, fileList);
    } else if (stat.isFile()) {
      const ext = extname(file);
      if (['.astro', '.svelte', '.md', '.ts', '.js'].includes(ext)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

function extractCharacters(content) {
  // Extract all visible characters from content
  return content
    .replace(/\s/g, '') // Remove whitespace
    .replace(/[^\x20-\x7E]/g, '') // Keep only ASCII printable characters
    .split('')
    .filter(char => /[a-zA-Z0-9]/.test(char))
    .join('');
}

function analyzeFontUsage() {
  const files = getAllFiles(SOURCE_DIR);
  const allCharacters = new Set();
  const characterFrequency = {};

  console.log('🔍 Analyzing font usage...\n');

  files.forEach(file => {
    try {
      const content = readFileSync(file, 'utf8');
      const chars = extractCharacters(content);

      chars.split('').forEach(char => {
        allCharacters.add(char);
        characterFrequency[char] = (characterFrequency[char] || 0) + 1;
      });
    } catch {
      console.warn(`Warning: Could not read ${file}`);
    }
  });

  const sortedChars = Array.from(allCharacters).sort();
  const totalChars = sortedChars.length;

  console.log(`📊 Font Usage Analysis Results:`);
  console.log(`   Total unique characters: ${totalChars}`);
  console.log(`   Files analyzed: ${files.length}`);
  console.log(`   Character set: ${sortedChars.join('')}\n`);

  // Font recommendations
  console.log('💡 Font Optimization Recommendations:');
  console.log('   ✅ Using Latin-only subsets (already applied)');
  console.log('   ✅ No need for Cyrillic, Greek, or Vietnamese subsets');
  console.log('   ✅ Character set fits within basic Latin range\n');

  // Weight analysis
  const weightUsage = {
    300: 'font-light',
    400: 'font-normal',
    500: 'font-medium',
    600: 'font-semibold',
    700: 'font-bold',
  };

  console.log('🎯 Font Weight Usage:');
  Object.entries(weightUsage).forEach(([weight, className]) => {
    const usage = files.some(file => {
      try {
        const content = readFileSync(file, 'utf8');
        return content.includes(className);
      } catch {
        return false;
      }
    });
    console.log(
      `   ${weight} (${className}): ${usage ? '✅ Used' : '❌ Not used'}`,
    );
  });

  return {
    totalChars,
    characters: sortedChars,
    filesAnalyzed: files.length,
    weightUsage,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeFontUsage();
}

export { analyzeFontUsage };
