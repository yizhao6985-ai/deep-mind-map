import { safeStorage } from 'electron'
import fs from 'fs'
import { resolveRoot, readSettings } from './settings'
import { secretsPath } from '../paths'

type SecretKey = 'ai.apiKey' | 'github.token'

type SecretBag = Partial<Record<SecretKey, string>>

/** 兼容旧版键名 github.pat */
function resolveKey(key: SecretKey | 'github.pat'): SecretKey {
  return key === 'github.pat' ? 'github.token' : key
}

function loadBag(): SecretBag {
  const root = resolveRoot(readSettings())
  const p = secretsPath(root)
  if (!fs.existsSync(p)) return {}
  try {
    const buf = fs.readFileSync(p)
    const raw = !safeStorage.isEncryptionAvailable()
      ? (JSON.parse(buf.toString('utf8')) as Record<string, string>)
      : (JSON.parse(safeStorage.decryptString(buf)) as Record<string, string>)
    const bag: SecretBag = {}
    if (raw['ai.apiKey']) bag['ai.apiKey'] = raw['ai.apiKey']
    if (raw['github.token']) bag['github.token'] = raw['github.token']
    else if (raw['github.pat']) bag['github.token'] = raw['github.pat']
    return bag
  } catch {
    return {}
  }
}

function saveBag(bag: SecretBag): void {
  const root = resolveRoot(readSettings())
  const p = secretsPath(root)
  const json = JSON.stringify(bag)
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(p, safeStorage.encryptString(json))
  } else {
    fs.writeFileSync(p, json, 'utf8')
  }
}

export function setSecret(key: SecretKey, value: string): void {
  const bag = loadBag()
  bag[key] = value
  saveBag(bag)
}

export function getSecret(key: SecretKey | 'github.pat'): string | null {
  const bag = loadBag()
  return bag[resolveKey(key)] ?? null
}

export function hasSecret(key: SecretKey | 'github.pat'): boolean {
  const v = getSecret(key)
  return Boolean(v && v.length > 0)
}

export function deleteSecret(key: SecretKey | 'github.pat'): void {
  const bag = loadBag()
  delete bag[resolveKey(key)]
  saveBag(bag)
}
