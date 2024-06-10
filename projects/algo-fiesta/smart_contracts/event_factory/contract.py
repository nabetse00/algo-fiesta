from algopy import (
    ARC4Contract,
    arc4,
    UInt64,
    log,
    itxn,
    OnCompleteAction,
    subroutine,
    op,
    Bytes,
    Account,
    Txn,
    gtxn,
    Global,
)

# import base64
# ref = "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"
# APPROVAL_BYTES = base64.b64decode(ref)
APPROVAL_BYTES = b'\n \t\x00\x01\x08 \x02\x03\x04\x06\x05&\r\x0cevent_status\x00\x0flast_type_index\x0bevent_owner\x0bevent_begin\tevent_end\x04name\x03tt-\x01 \x03ot-\x02\x00\x00\x03\x06\x81\x01\x02\x00\x061\x18@\x00\x03\x88\x07}1\x1bA\x00\xcc\x80\x04\xbf\xe4\xfc\n\x80\x04\xf9\x1c\xc3\xe2\x80\x04m\x95t\x87\x80\x04q@\xc2S\x80\x04\xb75_\xd16\x1a\x00\x8e\x05\x00\x01\x00=\x00d\x00z\x00\x93\x001\x19\x14D1\x18D6\x1a\x01W\x02\x006\x1a\x02\x17\xc0\x1c6\x1a\x03\x176\x1a\x04\x176\x1a\x056\x1a\x066\x1a\x076\x1a\x086\x1a\t6\x1a\n1\x16#\tI8\x10#\x12D\x88\x00n#C1\x19\x14D1\x18D6\x1a\x01\x17\xc0\x1c6\x1a\x02\x176\x1a\x03\x176\x1a\x041\x16#\tI8\x10#\x12D\x88\x01\xd1#C1\x19\x14D1\x18D6\x1a\x01\x17\xc0\x1c6\x1a\x02\x17\x88\x06\x03#C1\x19\x14D1\x18D6\x1a\x01\x17\xc0\x1c6\x1a\x02\x176\x1a\x03\x88\x06c#C1\x19\x14D1\x18D\x88\x06z#C1\x19\x14D1\x18\x14D#C\x8a\x0b\x00)!\x04\x88\x01\x062\n\x8b\xff8\x07K\x01\x12D\x8b\xff8 2\x03\x12Ds\x01D"(eD\x14D\x8b\xf62\x03\x13D+\x8b\xf6g2\x07\x81\xc0\xd1\x02\x08\x8b\xf7\x0cD\x8b\xf7\x81\x80\xa3\x05\x08\x8b\xf8\x0cD\'\x04\x8b\xf7g\'\x05\x8b\xf8g\x8b\xf9"Y"\x8b\x03\x8b\x02\x0cI\x8c\x00A\x00u\x8b\xf9W\x02\x00\x8b\x00D\x8b\x03IN\x02!\x04\x0bK\x01LYJY!\x04\x08XL\x8b\xfaW\x02\x00K\x01%\x0b%XL\x8b\xfbW\x02\x00K\x01$\x0bIN\x02$XL\x8b\xfcW\x02\x00K\x01$XL\x8b\xfdW\x02\x00K\x01$XL\x8b\xfeW\x02\x00L$X\x80\x02\x00BO\x06PO\x04PO\x03PO\x02PLPO\x02PK\x01L\x88\x00TH#\x08\x8c\x03B\xff\x80\'\x06\x8b\xf5g"*eD\x8b\x02\x08*Lg#\x88\x00T2\ns\x01D\x8b\x01\t\x8b\xff8\x08\x12D\x80\x17[EVENT MANAGER] Started\xb0\x89\x8a\x01\x002\x04\x8b\xff\x12D1 2\x03\x12D\x89\x8a\x02\x01\'\x07\x8b\xfe\x88\x00\x06\x8b\xff\xbf\x8b\xff\x89\x8a\x02\x01\x8b\xff\x16\x8b\xfeLP\x89\x8a\x01\x00"(eLIO\x02D\x8b\xff\x13A\x00>(\x8b\xffg\x8b\x00\x16\x80#[EVENT MANGER] Status Updated from LP\'\x08P\x80\x02toP\'\x08P\x8b\xff\x16P\xb0\x89\x8a\x05\x00"G\x02)!\x04\x88\xffy\x88\x01C2\n\x8b\xff8\x07K\x01\x12D\x8b\xff8 2\x03\x12Ds\x01D\'\x07\x8b\xfd\x88\xffzI\x88\x01YI\x8b\xfe"Y\x8b\xfc\x12DIW*\x08\x17LW:\x08\x17\x8b\xfc\x08IO\x02\x0eD\x81\xc8\x01\x0b\x81\xd8\x04\x08"\x88\x01:\'\t\x8b\xfb\x88\x01nG\x02\x88\x01rHLW\x01\x01\x80\x011\x12\x8b\xfcLA\x00\x1e\x8b\x08I!\x06YLI\x15LO\x02O\x02RW\x02\x00\x8b\xfd$\x0b$X\x17\x8b\xfc\x08\x8c\t\x8b\x06W2\x08\x8b\t\x16\xa7D\x80\x03sb-\x8b\xfd\x88\xff\x02I\x8c\x02\x8b\xfe\x88\x010\x8c\xfe\x14D\x80\x03ab-\x8b\xfd\x88\xfe\xec\x8c\x00\'\n\x8c\x01"\x8c\x03\x8b\x03\x8b\xfc\x0cA\x00F\x8b\xfeW\x02\x00\x8b\x03IN\x02%\x0b%X\x8b\x06I"YLI\x15LIO\x03O\x03RW\x02\x00LW\x02 O\x02\x88\x01_F\x02\x8b\x01W\x02\x00L\x16PI\x15$\n\x16W\x06\x00LP\x8c\x01#\x08\x8c\x03B\xff\xb2\x8b\x00\x8b\x01\x88\x01\x82\x8b\x02\x8b\xfe\x88\x01\xad\x8c\xfe\x8b\x07\x8b\xfd\x8b\xfeO\x03\x88\x01\xd2H\x8c\xfe\x8b\x05\x8b\x06\x8b\xfc\x88\x02\xf42\ns\x01LN\x02DW"\x08\x17\x8b\xfc\x0bL\x8b\x04\t\x08\x8b\xff8\x08\x0eD\x89\x8a\x00\x00\x88\x00\t"(eD!\x05\x13D\x89\x8a\x00\x002\x07I"\'\x05eD\rA\x00\x06!\x05\x88\xfe;\x89"\'\x04eD\x8b\x00\x0eA\x00\x06!\x04\x88\xfe*\x89\x89\x8a\x01\x01\x8b\xff\xbeD\x89\x8a\x02\x00\x8b\xfe\x81\n\x08\x8b\x002\x0c\rA\x00*\xb1!\x07\xb2\x10!\x08\xb2\x19\'\x0b\xb2\x1e\'\x0b\xb2\x1f\x8b\xff\x8d\x02\x00\x03\x00\tB\x00\n"\xb2\x01B\x00\x042\x00\xb2\x01\xb3B\xff\xce\x89\x8a\x02\x01\x8b\xfe\x8b\xffP\x89\x8a\x01\x02\x8b\xff\xbe\x89\x8a\x02\x02")G\x03\x8b\xfe\xbe@\x00\x08"\x8b\xff\x8c\x01\x8c\x00\x89\x8b\x05"Y\x8c\x03"\x8c\x01\x8b\x01\x8b\x03\x0cA\x00I\x8b\x05W\x02\x00\x8b\x01%\x0b%X\x8c\x00\x8b\xff"Y\x8c\x04"\x8c\x02\x8b\x02\x8b\x04\x0cA\x00"\x8b\xffW\x02\x00\x8b\x02%\x0b%X\x8b\x00\x12A\x00\x08#\x8b\xff\x8c\x01\x8c\x00\x89\x8b\x02#\x08\x8c\x02B\xff\xd6\x8b\x01#\x08\x8c\x01B\xff\xaf"\x8b\xff\x8c\x01\x8c\x00\x89\x8a\x03\x032\n\xb1\x8b\xfe\xb2(\x8b\xfd\xb2\'#\xb2$I\xb2,\x8b\xff\xb2*\xb2)"\xb2##\xb2"\x80\x07EVT-TCK\xb2%\x80\tEvent NFT\xb2&!\x05\xb2\x10"\xb2\x01\xb3\xb4<\x8b\xfe\x8b\xff\x89\x8a\x02\x01\x8b\xfe\xbe@\x00\x08\x8b\xfe\x8b\xff\xbfB\x00\x1d\x8b\x00W\x02\x00\x8b\xffW\x02\x00PI\x15$\n\x16W\x06\x00LP\x8b\xfe\xbcH\x8b\xfeL\xbf\x8b\xffL\x89\x8a\x02\x01\x8b\xfe\xbe@\x00\x08\x8b\xfe\x8b\xff\xbfB\x00\x1d\x8b\x00W\x02\x00\x8b\xffW\x02\x00PI\x15%\n\x16W\x06\x00LP\x8b\xfe\xbcH\x8b\xfeL\xbf\x8b\xffL\x89\x8a\x04\x02")I\x8b\xfe"YI\x8b\xff"Y\x12D\x8b\xfc\xbe@\x00y\'\n\x8c\x00"*eL\x8c\x02D"\x8c\x01\x8b\x01\x8b\x02\x0cA\x00%\x8b\x00W\x02\x00\x80\x08\x00\x00\x00\x00\x00\x00\x00\x00PI\x15$\n\x16W\x06\x00LP\x8c\x00\x8b\x01#\x08\x8c\x01B\xff\xd3\x8b\x03\x16\x8b\x00I"Y\x8b\xfd\rD\x8b\xfd$\x0b!\x04\x08O\x02]\x8b\xfe\x15!\x07\x08I\x16W\x06\x02\'\x0cLPL\x8b\xff\x15\x08\x16W\x06\x02P\x8b\xfeP\x8b\xffPLP\x8b\xfcL\xbfB\x00\x95\x8b\x04I!\x06YLI\x15LIK\x03O\x03RIW\x02\x00\x8b\xfd$\x0bIN\x03$X\x17\x8b\x03\x08\x16K\x01"Y\x8b\xfd\rDO\x02!\x04\x08L]N\x02I"YLI!\x04YK\x01O\x03K\x02RW\x02\x00\x8b\xfeW\x02\x00PI\x15%\n\x16W\x06\x00LPN\x02O\x03RW\x02\x00\x8b\xffW\x02\x00PI\x15$\n\x16W\x06\x00LPK\x01\x15!\x07\x08I\x16W\x06\x02\'\x0cLPLK\x02\x15\x08\x16W\x06\x02PO\x02PLPLP\x8b\xfc\xbcH\x8b\xfcL\xbf\x8b\xfe\x8b\xff\x8c\x01\x8c\x00\x89\x8a\x03\x01\x8b\xfeW:\x08\x17\x8b\xff\x08\x16\x8b\xfeL\\:\x8c\xfe\x8b\xfd"\x8b\xfe\xbb\x8b\xfe\x89\x8a\x02\x00\x88\xfd\x13\x8b\xfe\x8b\xff\x88\x00\x1aD2\n\xb1\x8b\xfe\xb2\x14\xb2\x13\x8b\xff\xb2\x11#\xb2\x12!\x06\xb2\x10"\xb2\x01\xb3\x89\x8a\x02\x01)\'\t\x8b\xfe\x88\xfdQ\x88\xfdWDI!\x04YLI!\x06YLO\x02O\x02RI"L"Y"\x8b\x04\x8b\x03\x0c\x8b\x02\x8c\x00A\x00!\x8b\x01W\x02\x00\x8b\x04$\x0b$X\x8b\xff\x16\xa8A\x00\x06#\x8c\x00B\x00\t\x8b\x04#\x08\x8c\x04B\xff\xd3\x89\x8a\x03\x00\x88\xfc\x9a"(eD!\x05\x12D\xb1\x8b\xfd\xb2."\xb2/\x8b\xfe\xb2-!\x08\xb2\x10"\xb2\x01\xb3\x89\x8a\x00\x00\x88\xfcw"(eD!\x05\x12D2\nIs\x00LN\x02DIs\x01DO\x02L\t\xb1"+eDO\x02\xb2\x00\xb2\x07\xb2\x08#\xb2\x10"\xb2\x01\xb3\x89\x8a\x00\x00\'\x06)g\'\x04"g\'\x05"g+2\x03g("g*"g\x80\x17[EVENT MANAGER] Created\xb0\x89'
# import base64
# ref = "CoEBQw=="
# CLEAR_BYTES = base64.b64decode(ref)
CLEAR_BYTES = b"\n\x81\x01C"

FACTORY_APP_CREATED = "Event Factory created"

BOX_COST = 2500
PER_BYTE_COST = 400

DEFAULT_PREFIX_LEN = 3
# Event Manager box is a mapping from ["em-"][index: uint64] => [app_id: uint64]
EVENT_MANAGER_BOX_PREFIX = b"em-"
EVENT_MANAGER_BOX_MBR = BOX_COST + PER_BYTE_COST * (DEFAULT_PREFIX_LEN + 8 + 8)
# Event Manager creator box is a mapping from ["ce-"][app_id: uint64] => [address: 32bytes]
EVENT_MANAGER_CREATOR_BOX_PREFIX = b"ce-"
EVENT_MANAGER_CREATOR_BOX_MBR = BOX_COST + PER_BYTE_COST * (DEFAULT_PREFIX_LEN + 8 + 32)

EVENT_CREATION_FEE = 2_000_000


class EventFactory(ARC4Contract):
    def __init__(self) -> None:
        self.last_event_manager = UInt64(0)
        self.factory_owner = Txn.sender
        log(FACTORY_APP_CREATED)

    @arc4.abimethod
    def create_event_manager(self, pay: gtxn.PaymentTransaction) -> UInt64:
        security_checks(UInt64(2))
        assert (
            pay.amount
            >= EVENT_CREATION_FEE
            + EVENT_MANAGER_BOX_MBR
            + EVENT_MANAGER_CREATOR_BOX_MBR
        ), "Min fee of 2 algos + mbr on event creation"
        app_addr = Global.current_application_address
        response = itxn.ApplicationCall(
            approval_program=APPROVAL_BYTES,
            clear_state_program=CLEAR_BYTES,
            global_num_bytes=2,
            global_num_uint=4,
            local_num_bytes=0,
            local_num_uint=0,
            on_completion=OnCompleteAction.NoOp,
            fee=0,
            extra_program_pages=1,
        ).submit()
        log(
            "Create manager: event",
            response.created_app.id,
            "from",
            Txn.sender,
            sep=" ",
        )
        itxn.Payment(
            amount=1_000_000,
            receiver=response.created_app.address,
            sender=app_addr,
            fee=0,
        ).submit()
        log("Transfered 0.1 Algos to", response.created_app.address, sep=" ")
        self.add_event_manager_boxes(response.created_app.id, Txn.sender)
        self.last_event_manager += 1
        return response.created_app.id
    
    @arc4.abimethod
    def withdraw(self) -> None:
        app_addr = Global.current_application_address
        amount = app_addr.balance - app_addr.min_balance
        itxn.Payment(
            amount=amount,
            receiver=self.factory_owner,
            sender=app_addr,
            fee=0,
        ).submit()
        return

    ################
    # Box handlers #
    ################
    # general
    @subroutine
    def box_key_from_uint64(self, prefix: Bytes, index: UInt64) -> Bytes:
        return op.concat(prefix, op.itob(index))

    @subroutine
    def box_key_from_address(self, prefix: Bytes, acc: Account) -> Bytes:
        return op.concat(prefix, acc.bytes)

    # boxes
    @subroutine
    def add_event_manager_boxes(self, app_id: UInt64, creator: Account) -> None:
        key_event = self.box_key_from_uint64(
            Bytes(EVENT_MANAGER_BOX_PREFIX), self.last_event_manager
        )
        key_creator = self.box_key_from_uint64(
            Bytes(EVENT_MANAGER_CREATOR_BOX_PREFIX), self.last_event_manager
        )
        op.Box.put(key_event, op.itob(app_id))
        op.Box.put(key_creator, creator.bytes)


######################
# Global subroutines #
######################
@subroutine
def security_checks(txn_number: UInt64) -> None:
    assert Global.group_size == txn_number, "Wrong group size"
    assert Txn.rekey_to == Global.zero_address, "Wrong rekey to"
