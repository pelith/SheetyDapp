type BigintIsh = JSBI | bigint | string;
type BigNumberish = string | number;

enum SolidityType {
  uint8 = 'uint8',
  uint256 = 'uint256',
}
function invariant(condition: any, message?: string): asserts condition {
  if (condition) {
    return;
  }
  // Condition not passed

  throw new Error(`Invariant failed: ${message || ''}`);
}

function validateSolidityTypeInstance(
  value: JSBI,
  solidityType: SolidityType
): void {
  const ZERO = JSBI.BigInt(0);

  const SOLIDITY_TYPE_MAXIMA = {
    [SolidityType.uint8]: JSBI.BigInt('0xff'),
    [SolidityType.uint256]: JSBI.BigInt(
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    ),
  };  
  invariant(
    JSBI.greaterThanOrEqual(value, ZERO),
    `${value} is not a ${solidityType}.`
  );
  invariant(
    JSBI.lessThanOrEqual(value, SOLIDITY_TYPE_MAXIMA[solidityType]),
    `${value} is not a ${solidityType}.`
  );
}

function parseBigintIsh(bigintIsh: BigintIsh): JSBI {
  return bigintIsh instanceof JSBI
    ? bigintIsh
    : typeof bigintIsh === 'bigint'
    ? JSBI.BigInt(bigintIsh.toString())
    : JSBI.BigInt(bigintIsh);
}

function parseUnits(value: string, unit: number): number {
  if (typeof(value) !== "string") {
    throw new Error("value must be a string");
  }
  

  const units = parseFloat(value)*(10**unit);
  return units;
}

function tryParseAmount(value: any) {
  try {
    let decimals = get('usdc.decimals')
    if (typeof(decimals) === 'string') {
      decimals = (decimals === '') ? 18 : +decimals;
    }
    else {
      decimals = 18;
    }
  
    return parseBigintIsh(parseUnits(value.toString(), decimals).toString());
  } catch (e) {
    return int('0');
  }
}

function int(value: BigintIsh) {
  return parseBigintIsh(value);
}
 
function add(x: JSBI, y: JSBI): JSBI {
  return JSBI.add(x, y);
}

function sub(x: JSBI, y: JSBI): JSBI {
  return JSBI.subtract(x, y);
}

function mul(x: JSBI, y: JSBI): JSBI {
  return JSBI.multiply(x, y);
}

function div(x: JSBI, y: JSBI): JSBI {
  return JSBI.divide(x, y);
}

function eq(x: JSBI, y: JSBI): boolean {
  return JSBI.equal(x, y);
}

function gt(x: JSBI, y: JSBI): boolean {
  return JSBI.greaterThan(x, y);
}

function ge(x: JSBI, y: JSBI): boolean {
  return JSBI.greaterThanOrEqual(x, y);
}

// mock the on-chain sqrt function
function sqrt(y: JSBI): JSBI {
  const ZERO = JSBI.BigInt(0);
  const ONE = JSBI.BigInt(1);
  const TWO = JSBI.BigInt(2);
  const THREE = JSBI.BigInt(3);  
  validateSolidityTypeInstance(y, SolidityType.uint256);
  let z: JSBI = ZERO;
  let x: JSBI;
  if (JSBI.greaterThan(y, THREE)) {
    z = y;
    x = JSBI.add(JSBI.divide(y, TWO), ONE);
    while (JSBI.lessThan(x, z)) {
      z = x;
      x = JSBI.divide(JSBI.add(JSBI.divide(y, x), x), TWO);
    }
  } else if (JSBI.notEqual(y, ZERO)) {
    z = ONE;
  }
  return z;
}

