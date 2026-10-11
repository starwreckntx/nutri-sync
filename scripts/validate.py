import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))

ok, bad = [], []
def check(name, cond, detail=''):
    (ok if cond else bad).append(name)
    print(f"{'PASS' if cond else 'FAIL'}  {name}  {detail}")

lines = [json.loads(l) for l in open(os.path.join(HERE, 'mcp-out.ndjson'), encoding='utf-8') if l.strip()]
by_id = {m['id']: m for m in lines}

r = by_id[1].get('result', {})
check('initialize: server identity', r.get('serverInfo', {}).get('name') == 'nutri-sync', r.get('serverInfo'))
check('initialize: protocol 2025-06-18', r.get('protocolVersion') == '2025-06-18')

tools = {t['name'] for t in by_id[2]['result']['tools']}
expected = {'get_profile', 'get_goals', 'get_today_summary', 'get_context', 'log_meal', 'log_weight'}
check('tool surface complete', expected <= tools, f'{len(tools)} tools exposed')

meal = by_id[3]['result']['content'][0]['text']
check('log_meal write (Spark -> app)', 'Validation oats' in meal and '"calories":350' in meal.replace(' ', ''))
weight = by_id[4]['result']['content'][0]['text']
check('log_weight write (Spark -> app)', '"kg":76.4' in weight.replace(' ', ''))

summary = by_id[5]['result']['content'][0]['text']
check('get_today_summary reflects write', 'Validation oats' in summary)
ctx = by_id[6]['result']['content'][0]['text']
check('get_context carries weight trend', '76.4' in ctx)
check('error handling: unknown tool', by_id[7]['result'].get('isError') is True)

state = json.load(open(os.path.join(HERE, 'nutri-validate.json'), encoding='utf-8'))
sl = state.get('syncLog', [])
check('sync audit trail records Spark writes',
      any(e.get('connector') == 'MCP / Gemini Spark' for e in sl), f'{len(sl)} audit entries')
check('schema: meals + weights arrays',
      isinstance(state.get('meals'), list) and isinstance(state.get('weights'), list))
check('meal source tagged mcp', state['meals'][0]['source'] == 'mcp')

print()
print(f'{len(ok)} passed, {len(bad)} failed')
sys.exit(1 if bad else 0)
