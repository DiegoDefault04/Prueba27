import type { TheoryBlock } from '../domain/types';

/**
 * Datos iniciales del temario. Se cargan de forma idempotente al arrancar
 * (o con `npm run seed`). Las respuestas correctas viven solo en el backend.
 */

export interface SeedOption {
  id: string;
  label: string;
  correct?: boolean;
}

export interface SeedActivity {
  id: string;
  prompt: string;
  options: SeedOption[];
}

export interface SeedTheory {
  id: string;
  title: string;
  body: TheoryBlock[];
}

export interface SeedTopic {
  id: string;
  title: string;
  main: SeedActivity;
  theory: SeedTheory;
  reinforcement: SeedActivity;
}

export const curriculum: SeedTopic[] = [
  {
    id: 'topic-1',
    title: 'Operaciones algebraicas',
    main: {
      id: 'A1',
      prompt: 'Resuelve x + 4 = 9.',
      options: [
        { id: 'A1-a', label: '3' },
        { id: 'A1-b', label: '5', correct: true },
        { id: 'A1-c', label: '13' },
      ],
    },
    theory: {
      id: 'T1',
      title: 'Despeje de incógnitas',
      body: [
        {
          kind: 'text',
          text: 'Para resolver una ecuación, debemos encontrar el valor de la incógnita que hace verdadera la igualdad.',
        },
        {
          kind: 'text',
          text: 'Podemos realizar operaciones equivalentes en ambos lados de la ecuación para aislar la incógnita.',
        },
        { kind: 'text', text: 'Por ejemplo:' },
        { kind: 'equation', text: 'x + 4 = 9' },
        { kind: 'text', text: 'Restamos 4 en ambos lados:' },
        { kind: 'equation', text: 'x = 9 - 4' },
        { kind: 'text', text: 'Por lo tanto:' },
        { kind: 'equation', text: 'x = 5' },
      ],
    },
    reinforcement: {
      id: 'R1',
      prompt: 'Resuelve 3x = 12.',
      options: [
        { id: 'R1-a', label: '4', correct: true },
        { id: 'R1-b', label: '9' },
        { id: 'R1-c', label: '36' },
      ],
    },
  },
  {
    id: 'topic-2',
    title: 'Ecuaciones lineales',
    main: {
      id: 'A2',
      prompt: 'Resuelve 2x + 3 = 11.',
      options: [
        { id: 'A2-a', label: '7' },
        { id: 'A2-b', label: '4', correct: true },
        { id: 'A2-c', label: '5' },
      ],
    },
    theory: {
      id: 'T2',
      title: 'Ecuaciones lineales de varios pasos',
      body: [
        {
          kind: 'text',
          text: 'Una ecuación lineal puede requerir más de una operación para encontrar el valor de la incógnita.',
        },
        {
          kind: 'text',
          text: 'Primero podemos eliminar los términos que se suman o restan y después despejar el coeficiente de la incógnita.',
        },
        { kind: 'text', text: 'Por ejemplo:' },
        { kind: 'equation', text: '2x + 3 = 11' },
        { kind: 'text', text: 'Restamos 3 en ambos lados:' },
        { kind: 'equation', text: '2x = 8' },
        { kind: 'text', text: 'Dividimos entre 2:' },
        { kind: 'equation', text: 'x = 4' },
      ],
    },
    reinforcement: {
      id: 'R2',
      prompt: 'Resuelve 5x - 7 = 8.',
      options: [
        { id: 'R2-a', label: '1' },
        { id: 'R2-b', label: '3', correct: true },
        { id: 'R2-c', label: '5' },
      ],
    },
  },
  {
    id: 'topic-3',
    title: 'Ecuaciones cuadráticas',
    main: {
      id: 'A3',
      prompt: 'Resuelve x² - 5x + 6 = 0.',
      options: [
        { id: 'A3-a', label: 'x = 2, x = 3', correct: true },
        { id: 'A3-b', label: 'x = 1, x = 6' },
        { id: 'A3-c', label: 'x = -2, x = -3' },
      ],
    },
    theory: {
      id: 'T3',
      title: 'Resolución de ecuaciones cuadráticas',
      body: [
        { kind: 'text', text: 'Una ecuación cuadrática contiene una incógnita elevada al cuadrado.' },
        {
          kind: 'text',
          text: 'Algunas ecuaciones cuadráticas pueden resolverse mediante factorización, expresándolas como el producto de dos factores.',
        },
        { kind: 'text', text: 'Por ejemplo:' },
        { kind: 'equation', text: 'x² - 5x + 6 = 0' },
        { kind: 'text', text: 'Factorizamos:' },
        { kind: 'equation', text: '(x - 2)(x - 3) = 0' },
        { kind: 'text', text: 'Para que el producto sea cero, al menos uno de los factores debe ser cero.' },
        { kind: 'text', text: 'Por lo tanto:' },
        { kind: 'equation', text: 'x = 2 o x = 3' },
      ],
    },
    reinforcement: {
      id: 'R3',
      prompt: 'Resuelve x² - 9 = 0.',
      options: [
        { id: 'R3-a', label: 'x = 3 únicamente' },
        { id: 'R3-b', label: 'x = -3, x = 3', correct: true },
        { id: 'R3-c', label: 'x = -9, x = 9' },
      ],
    },
  },
];
