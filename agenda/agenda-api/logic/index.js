const validateEmail = require('../utils/validate-email')
const moment = require('moment')
const mongoose = require('mongoose')
const { Contact, Note, User } = require('../data/models')

const logic = {
    _validateStringField(name, value) {
        if (typeof value !== 'string' || !value.length) throw new LogicError(`invalid ${name}`)
    },

    _validateEmail(email) {
        if (!validateEmail(email)) throw new LogicError('invalid email')
    },

    _validateDateField(name, field) {
        if (!(field instanceof Date)) throw new LogicError(`invalid ${name}`)
    },

    register(email, password) {
        return Promise.resolve()
            .then(() => {
                this._validateEmail(email)
                this._validateStringField('password', password)

                return User.findOne({ email })
            })
            .then(user => {
                if (user) throw new LogicError(`user with ${email} email already exist`)

                return User.create({ email, password })
            })
            .then(() => true)
    },

    authenticate(email, password) {
        return Promise.resolve()
            .then(() => {
                this._validateEmail(email)
                this._validateStringField('password', password)

                return User.findOne({ email })
            })
            .then(user => {
                if (!user) throw new LogicError(`user with ${email} email does not exist`)

                if (user.password !== password) throw new LogicError(`wrong password`)

                return true
            })
    },

    updatePassword(email, password, newPassword) {
        return Promise.resolve()
            .then(() => {
                this._validateEmail(email)
                this._validateStringField('password', password)
                this._validateStringField('new password', newPassword)

                return User.findOne({ email })
            })
            .then(user => {
                if (!user) throw new LogicError(`user with ${email} email does not exist`)

                if (user.password !== password) throw new LogicError(`wrong password`)

                if (password === newPassword) throw new LogicError('new password must be different to old password')

                user.password = newPassword

                return user.save()
            })
            .then(() => true)
    },

    unregisterUser(email, password) {
        return Promise.resolve()
            .then(() => {
                this._validateEmail(email)
                this._validateStringField('password', password)

                return User.findOne({ email })
            })
            .then(user => {
                if (!user) throw new LogicError(`user with ${email} email does not exist`)

                if (user.password !== password) throw new LogicError(`wrong password`)

                return User.deleteOne({ _id: user._id })
            })
            .then(() => true)
    },

    addNote(email, date, text) {
        return Promise.resolve()
            .then(() => {
                this._validateEmail(email)
                this._validateDateField('date', date)
                this._validateStringField('text', text)

                return User.findOne({ email })
            })
            .then(user => {
                if (!user) throw new LogicError(`user with ${email} email does not exist`)

                const note = { date, text, user: user.id }

                return Note.create(note)
            })
            .then(() => true)
    },

    listNotes(email, date) {
        return Promise.resolve()
            .then(() => {
                this._validateEmail(email)

                return User.findOne({ email })
            })
            .then(user => {
                if (!user) throw new LogicError(`user with ${email} email does not exist`)

                const mDate = moment(date)

                const minDate = mDate.startOf('day').toDate()
                const maxDate = mDate.endOf('day').toDate()

                return Note.find({ user: user._id, date: { $gte: minDate, $lte: maxDate } }, { __v: 0 }).lean()
            })
            .then(notes => {
                if (notes) {
                    notes.forEach(note => {
                        note.id = note._id.toString()

                        delete note._id

                        delete note.user
                    })
                }

                return notes || []
            })
    },

    removeNote(email, noteId) {
        return Promise.resolve()
            .then(() => {
                this._validateEmail(email)

                return User.findOne({ email })
            })
            .then((user) => {
                if (!user) throw new LogicError(`user with ${email} email does not exist`)

                return Note.findOne({ _id: noteId })
                    .then(note => {
                        if (!note) throw new LogicError(`note with id ${noteId} does not exist`)

                        if (note.user.toString() !== user.id) throw new LogicError('note does not belong to user')

                        return Note.deleteOne({ _id: noteId })
                    })
            })
            .then(() => true)
    },


    /////////////////////// CONTACT /////////////////////////////////
    addContact(email, name, surname, phone, contactEmail) {
        return Promise.resolve()
            .then(() => {
                this._validateEmail(email)
                this._validateEmail(contactEmail)
                this._validateStringField('name', name)
                this._validateStringField('surname', surname)
                //this._validateStringField('phone', phone)

                return User.findOne({ email })
            })
            .then( user => {
                if (!user) throw new LogicError(`user ${username} does not exist`)

                /*return this._users.updateOne(
                    { _id: user._id },
                    { $push: { notes: { _id: ObjectId(), date: new Date(date), text } } }
                 )*/
                const contact = { name, surname, phone, email: contactEmail }
                const contactModel = new Contact(contact)
                ////////////////// idNote!!!!!!!!!!!!!!!!
                user.contacts.push(contactModel)
                //user.contacts.addToSet(contactModel)

                return user.save()
            })
            .then(() => true)
    },

    listContacts(email, startsWith) {
        return Promise.resolve()
            .then(() => {
                this._validateEmail(email)
                this._validateStringField('startsWith filter', startsWith)

                return User.findOne({ email })
            })
            .then( user => {
                if (!user) throw new LogicError(`user ${username} does not exist`)

                const userId = user.id

                return User.aggregate([
                    { $match: { "_id": mongoose.Types.ObjectId(userId) } },
                    {
                       $project: {
                            contacts: {
                                $filter: {
                                    input: "$contacts",
                                    as: "contact",
                                    cond: { $eq: [ 
                                        { $substr: [ "$$contact.name", 0, 1 ] }, // first letter of name
                                        startsWith 
                                    ] }
                                }
                          }
                       }
                    }
                 ])
            })
            .then(res => {
                let contacts = []

                if (res && res[0] && res[0].contacts) {
                    contacts = res[0].contacts

                    contacts.forEach(contact => {
                        contact.id = contact._id.toString()

                        delete contact._id
                    })
                }

                return contacts
            })
        }

    /////////////////////// END CONTACT /////////////////////////////////


}

class LogicError extends Error {
    constructor(message) {
        super(message)
    }
}

module.exports = { logic, LogicError }