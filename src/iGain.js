function initApp() {
  set(get('trading.long.currency1') === 'USDC' ? 'trading.long.input1' : 'trading.long.input2', 0);
  set(get('trading.short.currency1') === 'USDC' ? 'trading.short.input1' : 'trading.short.input2', 0);
  set('liquidity.add.usdc.input', 0);
  set('liquidity.remove.usdc.input', 0);
}

function decimals() {
  let _decimals = +SpreadsheetApp.getActive().getRangeByName('usdc.decimals').getValue();
  if (_decimals === 0) _decimals = 6;
  return 10 ** +_decimals;
}

function getAmountOut(amountIn, reserveIn, reserveOut) {
  const amountInWithFee = mul(
    amountIn,
    int(997),
  );
  const numerator = mul(
    amountInWithFee,
    reserveOut,
  );
  const denominator = add(
    mul(
      reserveIn,
      int(1000),
    ),
    amountInWithFee,
  );
  const amountOut = div(
    numerator,
    denominator,
  );
  return amountOut;
}

function getAmountIn(amountOut, reserveIn, reserveOut) {
  const numerator = mul(
    mul(
      reserveIn,
      amountOut,
    ),
    int(1000),
  );
  const denominator = mul(
    sub(
      reserveOut,
      amountOut,
    ),
    int(997),
  );
  const amountIn = add(
    div(
      numerator,
      denominator,
    ),
    int(1),
  );
  return amountIn;
}

function doTransferOut(amount) {
  const protocolFee = parseBigintIsh(get('igain.protocolFee'));
  const fee = div(
    amount,
    protocolFee,
  );

  return sub(
    amount,
    fee,
  );
}

function protcolFee(inputAmount) {
  const amount = tryParseAmount(inputAmount);
  const protocolFee = parseBigintIsh(get('igain.protocolFee'));

  if (eq(amount, int(0)) || eq(protocolFee, int(0))) return '0';

  const fee = div(
    amount,
    protocolFee,
  );

  return fee.toString();
}

function mintA(inputAmount) {
  const amount = tryParseAmount(inputAmount);
  const poolA = parseBigintIsh(get('igain.poolA'));
  const poolB = parseBigintIsh(get('igain.poolB'));

  if (eq(amount, int(0)) || eq(poolA, int(0)) || eq(poolB, int(0))) return '0';

  return add(
    getAmountOut(
      amount,
      poolB,
      poolA,
    ),
    amount,
  ).toString();
}

function mintB(inputAmount) {
  const amount = tryParseAmount(inputAmount);
  const poolA = parseBigintIsh(get('igain.poolA'));
  const poolB = parseBigintIsh(get('igain.poolB'));

  if (eq(amount, int(0)) || eq(poolA, int(0)) || eq(poolB, int(0))) return '0';

  return add(
    getAmountOut(
      amount,
      poolA,
      poolB,
    ),
    amount,
  ).toString();
}

function mintLP(inputAmount) {
  const amount = tryParseAmount(inputAmount);
  const poolA = parseBigintIsh(get('igain.poolA'));
  const poolB = parseBigintIsh(get('igain.poolB'));
  const poolLP = parseBigintIsh(get('igain.poolLP'));

  if (eq(amount, int(0)) || eq(poolA, int(0)) || eq(poolB, int(0)) || eq(poolLP, int(0))) return '0';

  const k = mul(
    poolA,
    poolB,
  );

  const _k = mul(
    add(
      poolA,
      amount,
    ),
    add(
      poolB,
      amount,
    ),
  );

  // ( sqrt(_k/k) - 1 ) * LP

  let _lp = div(
    mul(
      sub(
        sqrt(div(
          mul(
            _k,
            int(1e36),
          ),
          k,
        )),
        int(1e18),
      ),
      poolLP,
    ),
    int(1e18),
  );

  _lp = div(
    mul(
      _lp,
      int(997),
    ),
    int(1000),
  );

  return _lp.toString();
}

function calcLPPriceImpact(inputAmount, reverse) {
  const poolA = parseBigintIsh(get('igain.poolA'));
  const poolB = parseBigintIsh(get('igain.poolB'));
  const poolLP = parseBigintIsh(get('igain.poolLP'));
  const amount = tryParseAmount(inputAmount);
  const lp = +reverse ? parseBigintIsh(burnLP(inputAmount)) : parseBigintIsh(mintLP(inputAmount));

  if (eq(amount, int(0)) || eq(lp, int(0)) || eq(poolA, int(0)) || eq(poolB, int(0)) || eq(poolLP, int(0))) return '0';

  // 2ab /  (a+b)
  const poolValue = div(
    mul(
      mul(
        poolA,
        poolB,
      ),
      int(2),
    ),
    add(
      poolA,
      poolB,
    ),
  );
  const spotPriceLP = div(
    mul(
      poolValue,
      int(1e18),
    ),
    poolLP,
  );

  if (+reverse) {
    const poolValueAdd = div(
      mul(
        mul(
          sub(
            poolA,
            amount,
          ),
          sub(
            poolB,
            amount,
          ),
        ),
        int(2),
      ),
      add(
        sub(
          poolA,
          amount,
        ),
        sub(
          poolB,
          amount,
        ),
      ),
    );

    const poolLPAdd = sub(
      poolLP,
      lp,
    );

    const finalPriceLP = div(
      mul(
        poolValueAdd,
        int(1e18),
      ),
      poolLPAdd,
    );

    return sub(
      int(decimals()),
      div(
        mul(
          finalPriceLP,
          int(decimals()),
        ),
        spotPriceLP,
      ),
    ).toString();
  }

  // poolValueAdd = 2(A+amount)(B+amount)/(A+B+2*amount)
  // totalLPadd = poolLP + lp
  const poolValueAdd = div(
    mul(
      mul(
        add(
          poolA,
          amount,
        ),
        add(
          poolB,
          amount,
        ),
      ),
      int(2),
    ),
    add(
      add(
        poolA,
        amount,
      ),
      add(
        poolB,
        amount,
      ),
    ),
  );
  const poolLPAdd = add(
    poolLP,
    lp,
  );
  const finalPriceLP = div(
    mul(
      poolValueAdd,
      int(1e18),
    ),
    poolLPAdd,
  );

  return sub(
    div(
      mul(
        finalPriceLP,
        int(decimals()),
      ),
      spotPriceLP,
    ),
    int(decimals()),
  ).toString();
}

function calcPriceImpact(inputAmount, long, reverse) {
  const amount = tryParseAmount(inputAmount);
  const poolA = parseBigintIsh(get('igain.poolA'));
  const poolB = parseBigintIsh(get('igain.poolB'));

  // div zero case
  if (eq(amount, int(0)) || eq(poolA, int(0)) || eq(poolB, int(0))) return '0';

  let _spotPrice = 0;
  if (+reverse) {
    _spotPrice = div(
      mul(
        long ? poolA : poolB,
        int(decimals()),
      ),
      add(
        poolA,
        poolB,
      ),
    );
  } else {
    _spotPrice = div(
      mul(
        add(
          poolA,
          poolB,
        ),
        int(decimals()),
      ),
      long ? poolA : poolB,
    );
  }
  let effPrice = 0;
  if (+reverse) {
    const temp = parseBigintIsh(long ? burnB(inputAmount) : burnA(inputAmount));
    if (JSBI.GT(
      temp,
      long ? poolA : poolB,
    ) || JSBI.GT(
      int(0),
      temp,
    )) return '0';

    effPrice = div(
      mul(
        amount,
        int(decimals()),
      ),
      temp,
    );
  } else {
    effPrice = div(
      mul(
        parseBigintIsh(long ? mintB(inputAmount) : mintA(inputAmount)),
        int(decimals()),
      ),
      amount,
    );
  }

  return sub(
    int(decimals()),
    div(
      mul(effPrice,
        int(decimals())),
      _spotPrice,
    ),
  ).toString();
}

function patchCalcPriceImpact(inputAmount) {
  return (inputAmount / (inputAmount + 1));
}

function settlementPriceLP() {
  const bPrice = parseBigintIsh(get('igain.bPrice'));
  const poolA = parseBigintIsh(get('igain.poolA'));
  const poolB = parseBigintIsh(get('igain.poolB'));
  const poolLP = parseBigintIsh(get('igain.poolLP'));
  const aPrice = sub(int(1e18), bPrice);

  if (eq(poolLP, int(0))) return '0';

  // totalValue = poolA*aPrice + poolB*bPrice
  const totalValue = add(mul(poolA, aPrice), mul(poolB, bPrice));
  const priceLP = div(totalValue, poolLP);
  return priceLP.toString();
}

function claim() {
  const bPrice = parseBigintIsh(get('igain.bPrice'));
  const poolA = parseBigintIsh(get('igain.poolA'));
  const poolB = parseBigintIsh(get('igain.poolB'));
  const poolLP = parseBigintIsh(get('igain.poolLP'));
  const _lp = parseBigintIsh(get('igain.lp'));
  let _a = parseBigintIsh(get('igain.a'));
  let _b = parseBigintIsh(get('igain.b'));

  if (eq(poolLP, int(0))) return '0';

  if (JSBI.greaterThan(_lp, int(0))) {
    _a = add(_a, div(mul(poolA, _lp), poolLP));
    _b = add(_b, div(mul(poolB, _lp), poolLP));
  }

  amount = div(
    add(
      mul(
        _a,
        sub(
          int(1e18),
          bPrice,
        ),
      ),
      mul(
        _b,
        bPrice,
      ),
    ),
    int(1e18),
  );

  return amount.toString();
}

function checkAllowance(inputAllowance, inputAmount) {
  const amount = tryParseAmount(inputAmount);
  const allowance = parseBigintIsh(inputAllowance);
  return JSBI.GT(allowance, amount);
}

function checkSwap(status, canBuy, inputAmount, inputBalance, inputPoolBalance, inputSlippage) {
  console.log(status, canBuy, inputAmount, inputBalance, inputPoolBalance, inputSlippage);
  let amount = tryParseAmount(inputAmount);
  const balance = parseBigintIsh(inputBalance);

  // check connect sys.status
  if (!+status) {
    return 'Connect first';
  }

  if (!canBuy) {
    return 'Expired';
  }

  if (inputPoolBalance) {
    const poolBalance = parseBigintIsh(inputPoolBalance);
    if (JSBI.GT(
      amount,
      poolBalance,
    ) || JSBI.GT(
      int(0),
      amount,
    )) {
      return 'Insufficient liq.';
    }
  }

  if (inputSlippage) {
    const slippage = tryParseAmount(inputSlippage);
    amount = div(
      mul(
        amount,
        add(
          int(decimals()),
          div(slippage, int(100)),
        ),
      ),
      int(decimals()),
    );
  }

  if (JSBI.GT(
    amount,
    balance,
  )) {
    return 'Out of balance';
  }

  return 0;
}

function checkClaim(status, canBuy) {
  // check connect sys.status
  if (!+status) {
    return 'Connect first';
  }

  if (canBuy) {
    return 'Not claimable';
  }

  return 0;
}

function swapLPButtonText(reverse) {
  let data = {};

  const sysStatus = get('sys.status');
  const igainCanBuy = get('igain.canBuy');

  if (reverse) {
    const buttonStatus = get('button.removelp.status');
    const input = get('liquidity.remove.lp.input');
    const priceImpact = get('lp.remove.priceimpact');

    const text = ({
      0: +priceImpact >= 15 ? 'Remove anyway' : 'Remove',
      1: 'Pending',
      2: 'Connect first',
    })[+buttonStatus];

    const igainLP = get('igain.lp');
    // const igainPoolLP = get('igain.lp');
    const slippage = get('liquidity.remove.slippage');

    data = {
      functionIndex: 6,
      text,
      statusNameRange: 'button.longswap.status',
      disabledText: checkSwap(sysStatus, igainCanBuy, input, igainLP, 0, slippage),
    };
  } else {
    const buttonStatus = get('button.addlp.status');
    const input = get('liquidity.add.usdc.input');
    const priceImpact = get('lp.add.priceimpact');

    const text = ({
      0: +priceImpact >= 15 ? 'Add anyway' : 'Add',
      1: 'Pending',
      2: 'Connect first',
    })[+buttonStatus];

    const allowance = get('usdc.allowance');
    const usdcBalance = get('usdc.balance');

    const approval = checkAllowance(allowance, input);

    data = {
      functionIndex: approval ? 5 : 0,
      text: approval ? text : 'Approve',
      statusNameRange: 'button.longswap.status',
      disabledText: checkSwap(sysStatus, igainCanBuy, input, usdcBalance),
    };
  }

  return JSON.stringify(data);
}

function swapLongButtonText(reverse) {
  let data = {};

  const sysStatus = get('sys.status');
  const igainCanBuy = get('igain.canBuy');
  const buttonStatus = get('button.longswap.status');
  const input = get('trading.long.input1');
  const priceImpact = get('trading.long.priceimpact');

  const text = ({
    0: +priceImpact >= 15 ? 'Swap anyway' : 'Swap',
    1: 'Pending',
    2: 'Connect first',
  })[+buttonStatus];

  if (reverse) {
    const igainB = get('igain.b');
    const igainPoolA = get('igain.poolA');
    const slippage = get('trading.long.slippage');

    data = {
      functionIndex: 4,
      text,
      statusNameRange: 'button.longswap.status',
      disabledText: checkSwap(sysStatus, igainCanBuy, input, igainB, igainPoolA, slippage),
    };
  } else {
    const allowance = get('usdc.allowance');
    const usdcBalance = get('usdc.balance');

    const approval = checkAllowance(allowance, input);

    data = {
      functionIndex: approval ? 3 : 0,
      text: approval ? text : 'Approve',
      statusNameRange: 'button.longswap.status',
      disabledText: checkSwap(sysStatus, igainCanBuy, input, usdcBalance),
    };
  }

  return JSON.stringify(data);
}

function swapShortButtonText(reverse) {
  let data = {};

  const sysStatus = get('sys.status');
  const igainCanBuy = get('igain.canBuy');
  const buttonStatus = get('button.shortswap.status');
  const input = get('trading.short.input1');
  const priceImpact = get('trading.short.priceimpact');

  const text = ({
    0: +priceImpact >= 15 ? 'Swap anyway' : 'Swap',
    1: 'Pending',
    2: 'Connect first',
  })[+buttonStatus];

  if (reverse) {
    const igainA = get('igain.a');
    const igainPoolB = get('igain.poolB');
    const slippage = get('trading.short.slippage');

    data = {
      functionIndex: 2,
      text,
      statusNameRange: 'button.shortswap.status',
      disabledText: checkSwap(sysStatus, igainCanBuy, input, igainA, igainPoolB, slippage),
    };
  } else {
    const allowance = get('usdc.allowance');
    const usdcBalance = get('usdc.balance');

    const approval = checkAllowance(allowance, input);

    data = {
      functionIndex: approval ? 1 : 0,
      text: approval ? text : 'Approve',
      statusNameRange: 'button.shortswap.status',
      disabledText: checkSwap(sysStatus, igainCanBuy, input, usdcBalance),
    };
  }

  return JSON.stringify(data);
}

function switchLongButton() {
  switchButton(
    'trading.long.currency1',
    'trading.long.currency2',
    'trading.long.input1',
    'trading.long.input2',
    'trading.long.swap',
    'trading.long.price',
    'swapLongButtonText',
    'mintB',
    'burnB',
  );
}

function switchShortButton() {
  switchButton(
    'trading.short.currency1',
    'trading.short.currency2',
    'trading.short.input1',
    'trading.short.input2',
    'trading.short.swap',
    'trading.short.price',
    'swapShortButtonText',
    'mintA',
    'burnA',
  );
}

function switchButton(
  currency1Name,
  currency2Name,
  input1Name,
  input2Name,
  swapButtonName,
  priceName,
  swapButtonText,
  mintName,
  burnName,
) {
  // Swap currency first
  const currency1Range = SpreadsheetApp.getActive().getRangeByName(currency1Name);
  const currency2Range = SpreadsheetApp.getActive().getRangeByName(currency2Name);
  const currency1 = currency1Range.getValue();
  const currency2 = currency2Range.getValue();
  currency1Range.setValue(currency2);
  currency2Range.setValue(currency1);

  // swap background
  const input1Range = SpreadsheetApp.getActive().getRangeByName(input1Name);
  const input2Range = SpreadsheetApp.getActive().getRangeByName(input2Name);
  // const input1Background = input2Range.getBackground();
  // const input2Background = input1Range.getBackground();
  // input1Range.setBackground(input1Background);
  // input2Range.setBackground(input2Background);

  const priceRange = SpreadsheetApp.getActive().getRangeByName(priceName);
  const swapButtonRange = SpreadsheetApp.getActive().getRangeByName(swapButtonName);
  const input1 = input2Range.getValue();
  const input2 = input1Range.getValue();
  const help1Text = 'Input Number only';
  const help2Text = 'Input USDC only';
  const rule1 = SpreadsheetApp.newDataValidation()
    .requireNumberGreaterThanOrEqualTo(0)
    .setHelpText(help1Text)
    .setAllowInvalid(false)
    .build();
  const rule2 = SpreadsheetApp.newDataValidation()
    .requireTextEqualTo(help2Text)
    .setHelpText(help2Text)
    .setAllowInvalid(false)
    .build();

  if (currency2 === 'USDC') {
    // swap input value
    input1Range.setValue(input1);
    input2Range.setFormula(`${mintName}(${input1Name})/${decimals()}`);

    // swap input data validation
    input1Range.setDataValidation(rule1);
    input2Range.setDataValidation(rule2);

    // swap price
    priceRange.setFormula(`calcPrice("${input1Name}", "${input2Name}", ${input2Name})`);

    // swap button
    swapButtonRange.setFormula(`button(
      ${swapButtonText}(false, sys.status, ${input2Name}, blockNumber),
      json(
        "name", "Trade",
        "x", ROW(),
        "y", COLUMN()
      ),
      ,
      ${input1Name},
      blockNumber
    )`);
  } else {
    input1Range.setValue(input1);
    input2Range.setFormula(`${burnName}(${input1Name})/${decimals()}`);

    input1Range.setDataValidation(rule1);
    input2Range.setDataValidation(rule2);

    priceRange.setFormula(`calcPrice("${input2Name}", "${input1Name}", ${input1Name})`);

    swapButtonRange.setFormula(`button(
      ${swapButtonText}(true, sys.status, ${input1Name}, blockNumber),
      json(
        "name", "Trade",
        "x", ROW(),
        "y", COLUMN()
      )
    )`);
  }
}

function calcPrice(aName, bName) {
  const a = tryParseAmount(get(aName));
  const b = tryParseAmount(get(bName));

  if (eq(a, int(0)) || eq(b, int(0))) return '0';

  return (div(
    mul(
      a,
      int(decimals()),
    ),
    b,
  ).toString() / decimals()).toFixed(3);
}

function test() {
  console.log(nowIL() * 100);
}

function burnPartialHelper(amountIn, reserveIn, reserveOut) {
  let x = add(
    div(
      mul(
        sub(
          reserveOut,
          amountIn,
        ),
        int(997),
      ),
      int(1000),
    ),
    reserveIn,
  );

  x = sqrt(add(
    mul(
      x,
      x,
    ),
    mul(
      mul(
        mul(
          mul(
            int(4),
            amountIn,
          ),
          reserveIn,
        ),
        int(997),
      ),
      int(1000),
    ),
  ));

  x = sub(
    sub(
      add(
        x,
        div(
          mul(
            amountIn,
            int(997),
          ),
          int(1000),
        ),
      ),
      div(
        mul(
          reserveOut, int(997),
        ), int(1000),
      ),
    ),
    reserveIn,
  );

  x = div(
    div(
      mul(
        x,
        int(1e18),
      ),
      int(997),
    ),
    int(2),
  );

  return x;
}

function burnA(inputAmount) {
  const amount = tryParseAmount(inputAmount);
  const poolA = parseBigintIsh(get('igain.poolA'));
  const poolB = parseBigintIsh(get('igain.poolB'));

  if (eq(amount, int(0)) || eq(poolA, int(0)) || eq(poolB, int(0))) return '0';

  const x = burnPartialHelper(amount, poolA, poolB);
  return sub(amount, x).toString();
}

function burnB(inputAmount) {
  const amount = tryParseAmount(inputAmount);
  const poolA = parseBigintIsh(get('igain.poolA'));
  const poolB = parseBigintIsh(get('igain.poolB'));

  if (eq(amount, int(0)) || eq(poolA, int(0)) || eq(poolB, int(0))) return '0';

  const x = burnPartialHelper(amount, poolB, poolA);
  return sub(amount, x).toString();
}

function burnLP(inputAmount) {
  const lp = tryParseAmount(inputAmount);
  const poolA = parseBigintIsh(get('igain.poolA'));
  const poolB = parseBigintIsh(get('igain.poolB'));
  const poolLP = parseBigintIsh(get('igain.poolLP'));

  if (eq(lp, int(0)) || eq(poolA, int(0)) || eq(poolB, int(0)) || eq(poolLP, int(0))) return '0';

  const s = add(poolA, poolB);

  let amount = div(
    div(
      mul(
        mul(
          mul(
            mul(
              poolA,
              poolB,
            ),
            int(4),
          ),
          int(997),
        ),
        lp,
      ),
      int(1000),
    ),
    poolLP,
  );

  amount = div(
    mul(
      amount,
      sub(
        int(2e18),
        div(
          mul(
            lp,
            int(997e15),
          ),
          poolLP,
        ),
      ),
    ),
    int(1e18),
  );

  amount = sqrt(sub(
    mul(
      s,
      s,
    ),
    amount,
  ));

  amount = div(
    sub(
      s,
      amount,
    ),
    int(2),
  );

  return amount;
}

function spotPrice(long) {
  const poolA = parseBigintIsh(get('igain.poolA'));
  const poolB = parseBigintIsh(get('igain.poolB'));
  if (eq(poolA, int(0)) || eq(poolB, int(0))) return '0';
  if (long) {
    return div(
      mul(
        poolA,
        int(decimals()),
      ),
      add(
        poolA,
        poolB,
      ),
    ).toString();
  }
  return div(
    mul(
      poolB,
      int(decimals()),
    ),
    add(
      poolA,
      poolB,
    ),
  ).toString();
}

function nowIL() {
  const openPrice = parseBigintIsh(get('igain.openPrice'));
  const latestPrice = parseBigintIsh(get('oracle.latestAnswer'));

  if (eq(openPrice, int(0)) || eq(latestPrice, int(0))) return '0';
  const ratio = div(
    mul(
      openPrice,
      int(1e18),
    ),
    latestPrice,
  );

  if (eq(ratio, int(1e18))) return '0';

  return sub(
    int(1e18),
    div(
      mul(
        sqrt(
          mul(
            int(1e18),
            ratio,
          ),
        ), int(2e18),
      ),
      add(
        ratio,
        int(1e18),
      ),
    ),
  ).toString() / 1e18;
}

function active0() {
  set('sys.nowActive', 0);
}

function active1() {
  set('sys.nowActive', 1);
}

function active2() {
  set('sys.nowActive', 2);
}

function active3() {
  set('sys.nowActive', 3);
}
