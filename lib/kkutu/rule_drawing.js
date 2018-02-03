/**
 * Rule the words! KKuTu Online
 * Copyright (C) 2017 JJoriping(op@jjo.kr)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

$lib.Drawing.roundReady = function (data, spec) {
  var tv = L['jqTheme'] + ': ' + L['theme_' + data.theme]

  clearBoard()
  $('.jjoriping,.rounds,.game-body').addClass('cw')
  $('.jjoriping,rounds').addClass('dg')
  $data._roundTime = $data.room.time * 1000
  $data._fastTime = 10000
  $stage.game.items.hide()
  $stage.game.hints.show()
  $stage.game.cwcmd.show().css('opacity', 0)
  console.log(data)
  if ($data.id === data.painter) {
    console.log('i\'m painter!')
  }
  drawRound(data.round)
  playSound('round_start')
  clearInterval($data._tTime)
}
$lib.Drawing.turnStart = function (data, spec) {
  $('.game-user-current').removeClass('game-user-current')
  $('.game-user-bomb').removeClass('game-user-bomb')
  if ($data.room.game.seq.indexOf($data.id) >= 0) $data._relay = true
  $stage.game.display.html($data._char = data.char)
  $lib.Drawing.drawDisplay()
  clearInterval($data._tTime)
  $data._tTime = addInterval(turnGoing, TICK)
  playBGM('jaqwi')
}
$lib.Drawing.turnHint = function (data) {
  playSound('mission')
  pushHint(data.hint)
}
$lib.Drawing.turnEnd = function (id, data) {
  var $sc = $('<div>').addClass('deltaScore').html('+' + data.score)
  var $uc = $('#game-user-' + id)

  if (data.giveup) {
    $uc.addClass('game-user-bomb')
  } else if (data.answer) {
    $stage.game.here.hide()
    $stage.game.display.html($('<label>').css('color', '#FFFF44').html(data.answer))
    stopBGM()
    playSound('horr')
  } else {
    // if(data.mean) turnHint(data);
    if (id == $data.id) $stage.game.here.hide()
    addScore(id, data.score)
    if ($data._roundTime > 10000) $data._roundTime = 10000
    drawObtainedScore($uc, $sc)
    updateScore(id, getScore(id)).addClass('game-user-current')
    playSound('success')
  }
}
$lib.Drawing.drawDisplay = function () {
  var $pane = $stage.game.display.empty()
  $('.jjoriping,rounds').addClass('dg')

  $pane.append($canvas = $('<canvas>')
    .attr('id', 'canvas')
    .css({
      width: '300',
      height: '300',
      left: 0,
      top: 0
    })
    .addClass('canvas')
  )

  var canvas = window._canvas = new fabric.Canvas('canvas')
  canvas.backgroundColor = '#ffffff'
  canvas.isDrawingMode = 1
  canvas.freeDrawingBrush.color = 'purple'
  canvas.freeDrawingBrush.width = 10
  canvas.setHeight(300)
  canvas.setWidth(300)
  canvas.renderAll()

  /* document.getElementById('colorpicker').addEventListener('click', function (e) {
    console.log(e.target.value)
    canvas.freeDrawingBrush.color = e.target.value
  }) */
}
$lib.Drawing.turnGoing = function () {
  var $rtb = $stage.game.roundBar
  var bRate
  var tt

  if (!$data.room) clearInterval($data._tTime)
  $data._roundTime -= TICK

  tt = $data._spectate ? L['stat_spectate'] : ($data._roundTime * 0.001).toFixed(1) + L['SECOND']
  $rtb
    .width($data._roundTime / $data.room.time * 0.1 + '%')
    .html(tt)

  if (!$rtb.hasClass('round-extreme')) {
    if ($data._roundTime <= $data._fastTime) {
      bRate = $data.bgm.currentTime / $data.bgm.duration
      if ($data.bgm.paused) stopBGM()
      else playBGM('jaqwiF')
      $data.bgm.currentTime = $data.bgm.duration * bRate
      $rtb.addClass('round-extreme')
    }
  }
}
