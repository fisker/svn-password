#!/usr/bin/env node

import path from 'path'
import {promises as fs} from 'fs'
import { unprotectData } from 'win-dpapi'
import prettyjson from 'prettyjson'
import boxen from 'boxen'

const realmDirectory = path.join(
  process.env.APPDATA,
  'Subversion',
  'auth',
  'svn.simple'
)

;(async function run() {
  const files = await fs.readdir(realmDirectory)
  for (const hash of files) {
    const result = await readFile(path.join(realmDirectory, hash))
    if (result.passtype === 'wincrypt') {
      try {
        result.passwordDecrypted = unprotectData(
          Buffer.from(result.password, 'base64'),
          null,
          'CurrentUser'
        ).toString()
      } catch {}
    }

    console.log(
      boxen(hash + '\n\n' + prettyjson.render(result), {
        padding: 1,
        margin: 1,
      })
    )
  }
})()

async function readFile(file) {
  const content = await fs.readFile(file, 'utf8')
  return Object.fromEntries(parseContent(content))
}

function* parseContent(content) {
  const lines = content.split('\n')
  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 4) {
    const [first, second, third, fourth] = lines.slice(
      lineNumber,
      lineNumber + 4
    )
    if (/^K \d+$/.test(first) && /^V \d+$/.test(third)) {
      yield [second, fourth]
    }
  }
}
