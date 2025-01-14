import '../../../shared/preload'

import { fireEvent, render, screen } from '@testing-library/react'
import electron from 'electron'
import cloneDeep from 'lodash/cloneDeep'

import { keyLayout } from '../../../../../__fixtures__/key-layout'
import {
  openedUrl,
  receivedRendererStartupSignal,
  retrievedInstalledApps,
} from '../../../../main/state/actions'
import { Channel } from '../../../../shared/state/channels'
import { defaultData } from '../../../../shared/state/reducer.data'
import { addChannelToAction } from '../../../../shared/utils/add-channel-to-action'
import { reorderedApp } from '../../../prefs/state/actions'
import { customWindow } from '../../../shared/custom.window'
import { clickedApp, pressedKey } from '../../state/actions'
import Wrapper from '../_bootstrap'

const originalNavigator = cloneDeep(customWindow.navigator)

beforeAll(() => {
  customWindow.navigator = {
    ...customWindow.navigator,
    keyboard: {
      getLayoutMap: jest
        .fn()
        .mockResolvedValue({ entries: jest.fn().mockReturnValue(keyLayout) }),
    },
  }
})

afterAll(() => {
  customWindow.navigator = originalNavigator
})

test('kitchen sink', () => {
  render(<Wrapper />)
  const win = new electron.BrowserWindow()
  win.webContents.send(
    Channel.MAIN,
    retrievedInstalledApps([
      'org.mozilla.firefox',
      'com.apple.Safari',
      'com.brave.Browser.nightly',
    ]),
  )
  // Check apps and app logos shown
  expect(screen.getByTestId('Firefox')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Firefox App' })).toBeVisible()
  expect(screen.getByTestId('Safari')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Safari App' })).toBeVisible()
  expect(screen.getByTestId('Brave Nightly')).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'Brave Nightly App' }),
  ).toBeVisible()

  expect(screen.getAllByRole('button', { name: /[A-z]+ App/u })).toHaveLength(3)

  win.webContents.send(
    Channel.MAIN,
    receivedRendererStartupSignal({
      data: {
        ...defaultData,
      },
      storage: {
        apps: [
          {
            hotCode: null,
            id: 'org.mozilla.firefox',
            isInstalled: true,
          },
          {
            hotCode: null,
            id: 'com.apple.Safari',
            isInstalled: true,
          },
          {
            hotCode: null,
            id: 'com.operasoftware.Opera',
            isInstalled: false,
          },
          {
            hotCode: null,
            id: 'com.brave.Browser.nightly',
            isInstalled: true,
          },
        ],
        height: 200,
        isSetup: true,
        supportMessage: -1,
      },
    }),
  )

  expect(
    screen.queryByRole('alert', { name: 'Loading browsers' }),
  ).not.toBeInTheDocument()

  // Correct info sent to main when app clicked
  fireEvent.click(screen.getByRole('button', { name: 'Firefox App' }))
  expect(electron.ipcRenderer.send).toHaveBeenCalledWith(
    Channel.PICKER,
    addChannelToAction(
      clickedApp({
        appId: 'org.mozilla.firefox',
        isAlt: false,
        isShift: false,
      }),
      Channel.PICKER,
    ),
  )

  // Correct info sent to main when app clicked
  const url = 'http://example.com'
  win.webContents.send(Channel.MAIN, openedUrl(url))
  fireEvent.click(screen.getByRole('button', { name: 'Brave Nightly App' }), {
    altKey: true,
  })
  expect(electron.ipcRenderer.send).toHaveBeenCalledWith(
    Channel.PICKER,
    addChannelToAction(
      clickedApp({
        appId: 'com.brave.Browser.nightly',
        isAlt: true,
        isShift: false,
      }),
      Channel.PICKER,
    ),
  )
})

test('should show spinner when no installed apps are found', () => {
  render(<Wrapper />)
  const win = new electron.BrowserWindow()
  win.webContents.send(
    Channel.MAIN,
    receivedRendererStartupSignal({
      data: defaultData,
      storage: {
        apps: [
          {
            hotCode: 'KeyS',
            id: 'com.apple.Safari',
            isInstalled: false,
          },
        ],
        height: 200,
        isSetup: true,
        supportMessage: -1,
      },
    }),
  )
  expect(screen.getByRole('alert', { name: 'Loading browsers' })).toBeVisible()
})

test('should use hotkey', () => {
  render(<Wrapper />)
  const win = new electron.BrowserWindow()
  win.webContents.send(
    Channel.MAIN,
    retrievedInstalledApps(['com.apple.Safari']),
  )
  win.webContents.send(
    Channel.MAIN,
    receivedRendererStartupSignal({
      data: defaultData,
      storage: {
        apps: [
          {
            hotCode: 'KeyS',
            id: 'com.apple.Safari',
            isInstalled: true,
          },
        ],
        height: 200,
        isSetup: true,
        supportMessage: -1,
      },
    }),
  )

  const url = 'http://example.com'
  win.webContents.send(Channel.MAIN, openedUrl(url))
  fireEvent.keyDown(document, { code: 'KeyS', key: 'S', keyCode: 83 })
  expect(electron.ipcRenderer.send).toHaveBeenCalledWith(
    Channel.PICKER,
    addChannelToAction(
      pressedKey({
        altKey: false,
        metaKey: false,
        physicalKey: 'KeyS',
        shiftKey: false,
        virtualKey: 's',
      }),
      Channel.PICKER,
    ),
  )
})

test('should use hotkey with alt', () => {
  render(<Wrapper />)
  const win = new electron.BrowserWindow()
  win.webContents.send(
    Channel.MAIN,
    retrievedInstalledApps(['com.apple.Safari']),
  )

  win.webContents.send(
    Channel.MAIN,
    receivedRendererStartupSignal({
      data: defaultData,
      storage: {
        apps: [
          {
            hotCode: 'KeyS',
            id: 'com.apple.Safari',
            isInstalled: true,
          },
        ],
        height: 200,
        isSetup: true,
        supportMessage: -1,
      },
    }),
  )

  const url = 'http://example.com'
  win.webContents.send(Channel.MAIN, openedUrl(url))
  fireEvent.keyDown(document, {
    altKey: true,
    code: 'KeyS',
    key: 's',
    keyCode: 83,
  })
  expect(electron.ipcRenderer.send).toHaveBeenCalledWith(
    Channel.PICKER,
    addChannelToAction(
      pressedKey({
        altKey: true,
        metaKey: false,
        physicalKey: 'KeyS',
        shiftKey: false,
        virtualKey: 's',
      }),
      Channel.PICKER,
    ),
  )
})

test('should hold shift', () => {
  render(<Wrapper />)
  const win = new electron.BrowserWindow()
  win.webContents.send(
    Channel.MAIN,
    retrievedInstalledApps(['org.mozilla.firefox']),
  )
  win.webContents.send(Channel.MAIN, openedUrl('http://example.com'))
  fireEvent.click(screen.getByRole('button', { name: 'Firefox App' }), {
    shiftKey: true,
  })
  expect(electron.ipcRenderer.send).toHaveBeenCalledWith(
    Channel.PICKER,
    addChannelToAction(
      clickedApp({
        appId: 'org.mozilla.firefox',
        isAlt: false,
        isShift: true,
      }),
      Channel.PICKER,
    ),
  )
})

test('should order tiles', () => {
  render(<Wrapper />)

  const win = new electron.BrowserWindow()

  win.webContents.send(
    Channel.MAIN,
    receivedRendererStartupSignal({
      data: defaultData,
      storage: {
        apps: [],
        height: 200,
        isSetup: true,
        supportMessage: -1,
      },
    }),
  )

  win.webContents.send(
    Channel.MAIN,
    retrievedInstalledApps([
      'org.mozilla.firefox',
      'com.apple.Safari',
      'com.operasoftware.Opera',
      'com.microsoft.edgemac',
      'com.brave.Browser',
    ]),
  )
  // Check tiles and tile logos shown
  const apps = screen.getAllByRole('button', { name: /[A-z]+ App/u })

  expect(apps).toHaveLength(5)

  win.webContents.send(
    Channel.MAIN,
    reorderedApp({
      destinationId: 'org.mozilla.firefox',
      sourceId: 'com.apple.Safari',
    }),
  )
  win.webContents.send(
    Channel.MAIN,
    reorderedApp({
      destinationId: 'org.mozilla.firefox',
      sourceId: 'com.operasoftware.Opera',
    }),
  )
  win.webContents.send(
    Channel.MAIN,
    reorderedApp({
      destinationId: 'org.mozilla.firefox',
      sourceId: 'com.brave.Browser',
    }),
  )

  const updatedApps = screen.getAllByRole('button', { name: /[A-z]+ App/u })

  expect(updatedApps[0]).toHaveAttribute('aria-label', 'Safari App')
  expect(updatedApps[1]).toHaveAttribute('aria-label', 'Opera App')
  expect(updatedApps[2]).toHaveAttribute('aria-label', 'Brave App')
  expect(updatedApps[3]).toHaveAttribute('aria-label', 'Firefox App')
  expect(updatedApps[4]).toHaveAttribute('aria-label', 'Edge App')
})
