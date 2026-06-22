// P2 Physics Expression Types
// Extends P1 symbolic expressions with dimensional annotations.

import { type SymExpr, type BinOp, type UnOp } from '../p1/symbolicExpr.js';
import { type DimVector } from './dimensionalConstraints.js';

// ---------------------------------------------------------------------------
// Physics Formula Entry
// ---------------------------------------------------------------------------

export interface PhysicsFormulaEntry {
  id: string;
  expr: SymExpr;
  category: string;
  description: string;
  inputDimension: number;
  /** Dimension of each variable, e.g., { m: [0,1,0], v: [1,0,-1] } */
  variableDimensions: Record<string, DimVector>;
  /** Expected output dimension */
  outputDimension: DimVector;
}
