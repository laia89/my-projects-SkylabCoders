'use strict'

require('dotenv').config()

const { logic } = require('.')
const { expect } = require('chai')
const { MongoClient, ObjectId } = require('mongodb')

const { MONGO_URL } = process.env

describe('logic', () => {
    let _conn, _db, _users, _notes
    const username = 'Jack', password = '123'

    before(done => {
        MongoClient.connect(MONGO_URL, {useNewUrlParser: true}, (err, conn) => {
            if (err) return done(err)

            _conn = conn

            const db = _db = conn.db()

            logic._users = _users = db.collection('users')

            logic._notes = _notes = db.collection('notes')

            done()
        })
    })

    beforeEach(() => {
        return _users.deleteMany()
            .then(() => _notes.deleteMany())
    })

    describe('_ validate string field', () => {
        it('it should fail on undefined value', () => {
            expect(() => logic._validateStringField('whatever', undefined)).to.throw(`invalid whatever`)
        })

        it('it should fail on empty value', () => {
            expect(() => logic._validateStringField('whatever', '')).to.throw(`invalid whatever`)
        })

        it('it should fail on numeric value', () => {
            expect(() => logic._validateStringField('whatever', 123)).to.throw(`invalid whatever`)
        })
    })

    describe('register', () => {
        it('should register on valid credentials', () => 
            _users.findOne({ username })
                .then(user => {
                    expect(user).to.be.null

                    return logic.register(username, password)
                })
                .then(() =>  _users.findOne({ username }))
                .then(user => {
                    expect(user).to.exist
                    expect(user.username).to.equal(username)
                    expect(user.password).to.equal(password)
                })
        )

        it('should fail on trying to register an already registered username', () =>
            _users.insertOne({username, password})
                .then(() => logic.register(username, password))
                .catch(err => err)
                .then(({message}) => expect(message).to.equal(`user ${username} already exists`))
        )

        it ('should fail on trying to register with an undefined username', () => 
            logic.register(undefined, password)
                .catch(err => err)
                .then(({message}) => expect(message).to.equal(`invalid username`))
        )

        it ('should fail on trying to register with an empty username', () => 
            logic.register('', password)
                .catch(err => err)
                .then(({message}) => expect(message).to.equal(`invalid username`))
        )

        it ('should fail on trying to register with a numeric username', () => 
            logic.register(123, password)
                .catch(err => err)
                .then(({message}) => expect(message).to.equal(`invalid username`))
        )

        it ('should fail on trying to register with an undefined password', () =>
            logic.register(username)
                .catch(err => err)
                .then(({message}) => expect(message).to.equal(`invalid password`))
        )

        it ('should fail on trying to register with an empty password', () =>
            logic.register(username, '')
                .catch(err => err)
                .then(({message}) => expect(message).to.equal(`invalid password`))
        )

        it ('should fail on trying to register with a numeric password', () =>
            logic.register(username, 123)
                .catch(err => err)
                .then(({message}) => expect(message).to.equal(`invalid password`))
        )
    })

    describe('authenticate', () => {
        beforeEach(() => _users.insertOne({username, password}))

        it('should authenticate on correct credentials', () => 
            logic.authenticate(username, password)
                .then(res => expect(res).to.be.true)
        )

        it('should fail on wrong credentials', () => 
            logic.authenticate('fulanito', 'notpass')
                .catch(err => err)
                .then(({message}) => expect(message).to.equal('user fulanito does not exist'))
        )

        it('should fail on wrong password', () => 
            logic.authenticate(username, '456')
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal('wrong credentials'))
        )

        it('should fail on trying to authenticate with an undefined username', () => 
            logic.authenticate(undefined, password)
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal('invalid username'))
        )

        it('should fail on trying to authenticate with an empty username', () => 
            logic.authenticate('', password)
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal('invalid username'))
        )

        it('should fail on trying to authenticate with a numeric username', () => 
            logic.authenticate(123, password)
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal('invalid username'))
        )

        it('should fail on trying to authenticate with an undefined password', () => 
            logic.authenticate(username, undefined)
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal('invalid password'))
        )

        it('should fail on trying to authenticate with an empty password', () => 
            logic.authenticate(username, '')
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal('invalid password'))
        )

        it('should fail on trying to authenticate with a numeric password', () => 
            logic.authenticate(username, 123)
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal('invalid password'))
        )
    })

    describe('update password', () => {
        const newPassword = `${password}-${Math.random()}`

        beforeEach(() => _users.insertOne({ username, password }))

        it('should update password on correct credentials and new password', () =>
            logic.updatePassword(username, password, newPassword)
                .then(res => {
                    expect(res).to.be.exist

                    return _users.findOne({ username })
                })
                .then(user => {
                    expect(user).to.exist
                    expect(user.username).to.equal(username)
                    expect(user.password).to.equal(newPassword)
                })
        )

        it('should fail on empty username', () => {
            logic.updatePassword('', password, newPassword)
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal(`invalid username`))
        })

        it('should fail on empty password', () => {
            logic.updatePassword(username, '', newPassword)
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal(`invalid password`))
        })

        it('should fail on empty new password', () =>
            logic.updatePassword(username, password, '')
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal(`invalid new password`))
        )

        it('should fail on numeric username', () => {
            logic.updatePassword(123, password, newPassword)
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal(`invalid username`))
        })

        it('should fail on numeric password', () => {
            logic.updatePassword(username, 123, newPassword)
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal(`invalid password`))
        })

        it('should fail on numeric new password', () =>
            logic.updatePassword(username, password, 123)
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal(`invalid new password`))
        )

        it('should fail on undefined username', () => {
            logic.updatePassword(undefined, password, newPassword)
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal(`invalid username`))
        })

        it('should fail on undefined password', () => {
            logic.updatePassword(username, undefined, newPassword)
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal(`invalid password`))
        })

        it('should fail on undefined new password', () =>
            logic.updatePassword(username, password, undefined)
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal(`invalid new password`))
        )

        it('should fail on numeric username', () => {
            logic.updatePassword(123, password, newPassword)
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal(`invalid username`))
        })

        it('should fail on numeric password', () => {
            logic.updatePassword(username, 123, newPassword)
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal(`invalid password`))
        })

        it('should fail on numeric new password', () =>
            logic.updatePassword(username, password, 123)
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal(`invalid new password`))
        )

        it('should fail on new password same as current password', () =>
            logic.updatePassword(username, password, password)
                .catch(err => err)
                .then(({ message }) => expect(message).to.equal(`new password cannot be same as current password`))
        )

    })

    describe('add note', () => {
        const text = 'my text note', date = new Date()

        beforeEach(() => _users.insertOne({ username, password }) )

        it('should add a correct note created by an existent user', () => {
            let userId = null
            return _users.findOne({ username })
                .then(user => {
                    expect(user).to.exist

                    userId = user._id

                    return logic.addNote(username, text, date)
                })
                .then((res) => {
                    expect(res).to.be.true

                    return _notes.findOne({ userId })
                })
                .then(note => {
                    expect(note).to.exist
                    expect(note.userId.toString()).to.equal(userId.toString())
                    expect(note.text).to.equal(text)
                    expect(note.date).to.deep.equal(date)
                })
        })

        it('should fail on an empty username when trying to add a note', () => 
            logic.addNote('', text, date)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid username')
                })
        )

        it('should fail on an undefined username when trying to add a note', () => 
            logic.addNote(undefined, text, date)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid username')
                })
        )

        it('should fail on a numeric username when trying to add a note', () => 
            logic.addNote(123, text, date)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid username')
                })
        )

        it('should fail on an empty text when trying to add a note', () => 
            logic.addNote(username, '', date)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid note text')
                })
        )

        it('should fail on an undefined text when trying to add a note', () => 
            logic.addNote(username, undefined, date)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid note text')
                })
        )

        it('should fail on a numeric text when trying to add a note', () => 
            logic.addNote(username, 123, date)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid note text')
                })
        )

        it('should fail on an undefined date when trying to add a note', () => 
            logic.addNote(username, text, undefined)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid date')
                })
        )

        it('should fail on an string date when trying to add a note', () => 
            logic.addNote(username, text, '1234441111')
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid date')
                })
        )

        it('should fail on a numeric date when trying to add a note', () => 
            logic.addNote(username, text, 1234441111)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid date')
                })
        )

    })


    describe('update note', () => {
        const text = 'my text note', date = new Date(), newText = 'my updated text note'
        let userId = null, idNote = null

        beforeEach(() => 
            _users.insertOne({ username, password })
                .then(() => _users.findOne({ username }))
                .then(user => {
                    userId = user._id
                    return _notes.insertOne( { date, text, userId } )
                })
                .then(() => _notes.findOne( { date, text, userId } ))
                .then(note => {
                    idNote = note._id
                    return true
                })
        )

        it('should update a note on correct content and date', () => {
            return logic.updateNote(username, idNote, newText)
                .then(res => {
                    expect(res).to.be.true

                    return _notes.findOne({ _id: ObjectId(idNote) })
                })
                .then(note => {
                    expect(note).to.exist
                    expect(note.text).to.equal(newText)
                    expect(note.date).to.deep.equal(date)
                })
        })

        it('should fail on an empty username when trying to update a note', () => 
            logic.updateNote('', idNote, newText)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid username')
                })
        )

        it('should fail on an undefined username when trying to update a note', () => 
            logic.updateNote(undefined, idNote, newText)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid username')
                })
        )

        it('should fail on a numeric username when trying to update a note', () => 
            logic.updateNote(123, idNote, newText)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid username')
                })
        )

        it('should fail on an empty id note when trying to update a note', () => 
            logic.updateNote(username, '', newText)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid id note')
                })
        )

        it('should fail on an undefined id note when trying to update a note', () => 
            logic.updateNote(username, undefined, newText)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid id note')
                })
        )

        it('should fail on a non existant id note when trying to update a note', () => 
            logic.updateNote(username, 123, newText)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal(`note with id: "123" does not exist`)
                })
        )

        it('should fail on an empty text when trying to update a note', () => 
            logic.updateNote(username, idNote, '')
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid note text')
                })
        )

        it('should fail on an undefined text when trying to update a note', () => 
            logic.updateNote(username, idNote, undefined)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid note text')
                })
        )

        it('should fail on a numeric text when trying to update a note', () => 
            logic.updateNote(username, idNote, 123)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid note text')
                })
        )
 
    })

    describe('delete note', () => {
        //const text = 'my text note', date = new Date(), idNote = '5b794f56a0da0925f2ba2997'
        const text = 'my text note', date = new Date()
        let userId = null, idNote = null

        beforeEach(() => 
            _users.insertOne({ username, password })
                .then(() => _users.findOne({ username }))
                .then(user => {
                    userId = user._id
                    return _notes.insertOne( { date, text, userId } )
                })
                .then(res => {
                    idNote = res.ops[0]._id.toString()
                    return true
                })
                /*.then(() => _notes.findOne( { date, text, userId } ))
                .then(note => {
                    idNote = note._id
                    return true
                })*/

        //////////////////////// treure id's del insert!!!!!!!!!!
        )

        it('should delete one note on correct id', () => {
            return logic.deleteNote(username, idNote)
                .then(res => {
                    expect(res).to.be.true

                    return _notes.findOne({ _id: ObjectId(idNote) })
                })
                .then(note => {
                    expect(note).not.to.exist
                })
        })

        it('should fail on an empty username when trying to delete a note', () => 
            logic.deleteNote('', idNote)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid username')
                })
        )

        it('should fail on an undefined username when trying to delete a note', () => 
            logic.deleteNote(undefined, idNote)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid username')
                })
        )

        it('should fail on a numeric username when trying to delete a note', () => 
            logic.deleteNote(123, idNote)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid username')
                })
        )

        it('should fail on an empty id note when trying to delete a note', () => 
            logic.deleteNote(username, '')
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid id note')
                })
        )

        it('should fail on an undefined id note when trying to delete a note', () => 
            logic.deleteNote(username, undefined)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal('invalid id note')
                })
        )

        it('should fail on a non existant id note when trying to delete a note', () => 
            logic.deleteNote(username, 123)
                .catch(err => err)
                .then(({message}) => {
                    expect(message).to.equal(`note with id: "123" does not exist`)
                })
        )
 
    })

    describe('list notes by date', () => {
        const text = 'my text note', today = new Date(), tomorrow = new Date(new Date().setDate(new Date().getDate() + 1))
        let userId = null

        beforeEach(() => 
            _users.insertOne({ username, password })
                .then(() => _users.findOne({ username }))
                .then((user) => {
                    userId = user._id
                    return _notes.insertMany([
                        { date: today, text, userId },
                        { date: today, text, userId },
                        { date: tomorrow, text, userId },
                        { date: tomorrow, text, userId },
                    ])
                })
        )

        it(`should retrieve all notes from today created by ${username}`, () => 
            logic.getNotesByDate(username, today)
                .then(notes => {
                    expect(notes).to.exist
                    expect(notes.length).to.equal(2)

                    const firstNote = notes[0],
                        secondNote = notes[1]

                    expect(firstNote.userId).to.exist
                    expect(firstNote.userId.toString()).to.equal(userId.toString())
                    expect(firstNote.text).to.equal(text)
                    expect(firstNote.date).to.deep.equal(today)

                    expect(secondNote.userId).to.exist
                    expect(secondNote.userId.toString()).to.equal(userId.toString())
                    expect(secondNote.text).to.equal(text)
                    expect(secondNote.date).to.deep.equal(today)

                })
        )

        it(`should retrieve all notes from tomorrow created by ${username}`, () => 
            logic.getNotesByDate(username, tomorrow)
                .then(notes => {
                    expect(notes).to.exist
                    expect(notes.length).to.equal(2)

                    const firstNote = notes[0],
                        secondNote = notes[1]

                    expect(firstNote.userId.toString()).to.equal(userId.toString())
                    expect(firstNote.text).to.equal(text)
                    expect(firstNote.date).to.deep.equal(tomorrow)

                    expect(secondNote.userId.toString()).to.equal(userId.toString())
                    expect(secondNote.text).to.equal(text)
                    expect(secondNote.date).to.deep.equal(tomorrow)

                })
        )
    })

    after(() => {
        return _users.deleteMany()
            .then(() => _notes.deleteMany())
            .then(() => _conn.close())
    })
    
}

)