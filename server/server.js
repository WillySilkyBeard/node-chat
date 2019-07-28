const express = require('express')
const socketIO = require('socket.io')
const path = require('path')
const http = require('http')
const users = require('./users')()

const port = process.env.PORT || 3005
const publicPath = path.join(__dirname, '../public')

const app = express()
const server = http.createServer(app)
const io = socketIO(server)
// io.emit - отправляет ВСЕМ пользователям
// socket.emit - отправляет текущему пользователю
// socket.broadcast.emit - отправляет всем кроме меня
const message = (name,text, id) => ({name, text, id})

app.use(express.static(publicPath))

io.on('connection', socket => {
    //console.log('IO connected');
    // присоединение
    socket.on('join', (user,callback) => {
        if(!user.name || !user.room) {
            return callback('Enter valid user data')
        }

        callback({userId: socket.id})

        socket.join(user.room)

        users.remove(socket.id)
        users.add(socket.id, user.name, user.room)

        io.to(user.room).emit('users:update', users.getByRoom(user.room))

        socket.emit('message:new', message('Admin', `Welcome, ${user.name}`))
        socket.broadcast.to(user.room).emit('message:new', message('Admin', `${user.name}, joined..`))
    })
    socket.on('message:create', (data, callback) =>{
        if(!data) {
            callback(`Message can't be empty`)
        } else {
            const user = users.get(socket.id)
            if(user) {
                io.to(user.room).emit('message:new', message(data.name, data.text, data.id))
            }
            callback()
        }
    })

    socket.on('disconnect', () => {
        const user = users.remove(socket.id)
        if(user) {
            io.to(user.room).emit('message:new', message('Admin', `${user.name}, left..`))
            io.to(user.room).emit('users:update', users.getByRoom(user.room))
        }
    })
})

server.listen(port, () => {
    console.log(`Server has been started on http://localhost:${port}`);
})