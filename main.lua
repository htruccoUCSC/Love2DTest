function love.load()
    square = {}
    square.x = 100
    square.y = 100
    square.size = 50
    square.speed = 200 -- pixels per second
end

function love.update(dt)
    if love.keyboard.isDown("right") then
        square.x = square.x + square.speed * dt
    end
    if love.keyboard.isDown("left") then
        square.x = square.x - square.speed * dt
    end
    if love.keyboard.isDown("down") then
        square.y = square.y + square.speed * dt
    end
    if love.keyboard.isDown("up") then
        square.y = square.y - square.speed * dt
    end
end

function love.draw()
    love.graphics.setColor(1, 0, 0) -- Set color to red
    love.graphics.rectangle("fill", square.x, square.y, square.size, square.size)
end